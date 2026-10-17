from datetime import timedelta

from django.conf import settings
from django.contrib.auth.password_validation import get_default_password_validators
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.settings import api_settings as jwt_settings

from demandes.views import ROLES_CREATION_DEMANDE, TRANSITIONS_AUTORISEES
from utilisateurs.models import OTPCode, Utilisateur
from utilisateurs.langue import EnFrancais
from utilisateurs.permissions import EstAdministrateurSysteme
from .models import AdresseNotificationEquipe, JournalActivite
from .serializers import AdminUtilisateurSerializer, AdresseEquipeSerializer, JournalActiviteSerializer
from .services import envoyer_email_equipe, envoyer_lien_mot_de_passe, journaliser

Operation = JournalActivite.Operation
Role = Utilisateur.Role


class JournalPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'taille'
    max_page_size = 200


class JournalActiviteViewSet(EnFrancais, viewsets.ReadOnlyModelViewSet):
    """Consultation du journal (lecture seule), réservée à l'administrateur système."""
    queryset = JournalActivite.objects.all()
    serializer_class = JournalActiviteSerializer
    permission_classes = [EstAdministrateurSysteme]
    pagination_class = JournalPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get('categorie'):
            queryset = queryset.filter(categorie=params['categorie'])
        if params.get('operation'):
            queryset = queryset.filter(operation=params['operation'])
        if params.get('utilisateur'):
            terme = params['utilisateur']
            queryset = queryset.filter(Q(auteur_username__icontains=terme) | Q(cible_username__icontains=terme))
        if params.get('date_debut'):
            queryset = queryset.filter(date__date__gte=params['date_debut'])
        if params.get('date_fin'):
            queryset = queryset.filter(date__date__lte=params['date_fin'])
        return queryset


def invalider_otp(user):
    OTPCode.objects.filter(utilisateur=user, is_used=False).update(is_used=True)


def autres_admins_actifs(user):
    return Utilisateur.objects.filter(role=Role.ADMIN_SYSTEME, is_active=True).exclude(pk=user.pk).exists()


class UtilisateurAdminViewSet(EnFrancais, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                              mixins.CreateModelMixin, mixins.UpdateModelMixin,
                              viewsets.GenericViewSet):
    """
    Gestion des comptes par l'administrateur système.
    Pas de suppression : un compte se désactive, ce qui préserve l'historique des demandes.
    """
    queryset = Utilisateur.objects.all().order_by('username')
    serializer_class = AdminUtilisateurSerializer
    permission_classes = [EstAdministrateurSysteme]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get('recherche'):
            terme = params['recherche'].strip()
            queryset = queryset.filter(
                Q(username__icontains=terme) | Q(first_name__icontains=terme)
                | Q(last_name__icontains=terme) | Q(email__icontains=terme)
            )
        if params.get('role'):
            queryset = queryset.filter(role=params['role'])
        if params.get('actif') in ('true', 'false'):
            queryset = queryset.filter(is_active=params['actif'] == 'true')
        return queryset

    def perform_create(self, serializer):
        # Aucun mot de passe choisi par l'administrateur : l'utilisateur le définit
        # lui-même via le lien personnel envoyé à son adresse.
        with transaction.atomic():
            user = serializer.save(is_active=True, is_staff=False, is_superuser=False)
            user.set_unusable_password()
            user.save(update_fields=['password'])
            journaliser(Operation.COMPTE_CREE, auteur=self.request.user, cible=user, request=self.request,
                        details={'role': user.role})
        # Un échec d'envoi ne défait pas la création : le lien peut être renvoyé
        # par « Réinitialiser l'accès ».
        self.lien_envoye = envoyer_lien_mot_de_passe(user, nouveau_compte=True)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.data['lien_envoye'] = self.lien_envoye
        return response

    @transaction.atomic
    def perform_update(self, serializer):
        user = serializer.instance
        avant = {champ: getattr(user, champ) for champ in serializer.validated_data}
        ancien_role = user.role
        if ancien_role == Role.ADMIN_SYSTEME and serializer.validated_data.get('role', ancien_role) != ancien_role \
                and user.is_active and not autres_admins_actifs(user):
            raise ValidationError({'role': "Impossible de retirer le rôle du dernier administrateur actif."})
        user = serializer.save()
        modifies = sorted(champ for champ, valeur in avant.items() if getattr(user, champ) != valeur)
        if user.role != ancien_role:
            journaliser(Operation.ROLE_MODIFIE, auteur=self.request.user, cible=user, request=self.request,
                        details={'ancien_role': ancien_role, 'nouveau_role': user.role})
        autres = [champ for champ in modifies if champ != 'role']
        if autres:
            journaliser(Operation.COMPTE_MODIFIE, auteur=self.request.user, cible=user, request=self.request,
                        details={'champs': autres})

    def _repondre(self, user, **extra):
        return Response({**self.get_serializer(user).data, **extra})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def activer(self, request, pk=None):
        user = self.get_object()
        if user.is_active:
            return Response({'detail': 'Ce compte est déjà actif.'}, status=status.HTTP_409_CONFLICT)
        user.is_active = True
        user.save(update_fields=['is_active'])
        journaliser(Operation.COMPTE_ACTIVE, auteur=request.user, cible=user, request=request)
        return self._repondre(user)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def desactiver(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active:
            return Response({'detail': 'Ce compte est déjà désactivé.'}, status=status.HTTP_409_CONFLICT)
        if user.role == Role.ADMIN_SYSTEME and not autres_admins_actifs(user):
            return Response({'detail': 'Impossible de désactiver le dernier administrateur actif.'},
                            status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active'])
        # Les jetons d'accès sont refusés dès la requête suivante (JWT vérifie is_active)
        invalider_otp(user)
        journaliser(Operation.COMPTE_DESACTIVE, auteur=request.user, cible=user, request=request)
        return self._repondre(user)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reinitialiser_acces(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({'detail': 'Utilisez la procédure habituelle pour votre propre compte.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active:
            return Response({'detail': "Activez d'abord ce compte avant de réinitialiser son accès."},
                            status=status.HTTP_409_CONFLICT)
        if not user.email:
            return Response({'detail': "Ce compte n'a pas d'adresse e-mail : renseignez-la avant de réinitialiser l'accès."},
                            status=status.HTTP_400_BAD_REQUEST)
        # L'ancien mot de passe cesse immédiatement de fonctionner
        user.set_unusable_password()
        user.save(update_fields=['password'])
        invalider_otp(user)
        lien_envoye = envoyer_lien_mot_de_passe(user, nouveau_compte=False)
        journaliser(Operation.REINITIALISATION_DEMANDEE, auteur=request.user, cible=user, request=request,
                    details={'lien_envoye': lien_envoye})
        return self._repondre(user, lien_envoye=lien_envoye)


OPERATIONS_ECHEC_CONNEXION = (Operation.ECHEC_MOT_DE_PASSE, Operation.ECHEC_OTP, Operation.OTP_BLOQUE)
SEUIL_ECHECS_24H = 5


def libelle_role(code):
    return dict(Role.choices).get(code, f"Rôle obsolète ({code})")


def alertes_securite():
    """Alertes calculées sur l'état réel des comptes, du journal et de la configuration."""
    alertes = []
    actifs = Utilisateur.objects.filter(is_active=True)

    def ajouter(niveau, code, message, nombre=None):
        alertes.append({'niveau': niveau, 'code': code, 'message': message, 'nombre': nombre})

    secret = settings.SECRET_KEY or ''
    if secret.startswith('django-insecure') or len(secret) < 50 or len(set(secret)) < 5:
        ajouter('critique', 'SECRET_KEY_FAIBLE',
                "La clé secrète Django est faible ou par défaut : définissez DJANGO_SECRET_KEY (50 caractères aléatoires minimum).")
    if settings.DEBUG:
        ajouter('attention', 'DEBUG_ACTIF',
                "Le mode DEBUG est activé : à désactiver en production (DJANGO_DEBUG=False).")

    nb_admins = actifs.filter(role=Role.ADMIN_SYSTEME).count()
    if nb_admins <= 1:
        ajouter('attention', 'ADMIN_UNIQUE',
                "Un seul administrateur actif : prévoyez un second compte administrateur pour la continuité.", nb_admins)

    roles_valides = set(Role.values)
    obsoletes = actifs.exclude(role__in=roles_valides).count()
    if obsoletes:
        ajouter('attention', 'ROLES_OBSOLETES',
                "Des comptes actifs ont un rôle obsolète : ils n'accèdent à rien, désactivez-les ou attribuez-leur un rôle.",
                obsoletes)

    superutilisateurs = actifs.filter(is_superuser=True).count()
    if superutilisateurs:
        ajouter('attention', 'SUPERUTILISATEURS',
                "Des comptes actifs sont superutilisateurs Django : ils peuvent tout modifier via /admin/ sans passer par l'espace Administrateur.",
                superutilisateurs)

    sans_email = actifs.filter(Q(email='') | Q(email__isnull=True)).count()
    if sans_email:
        ajouter('attention', 'SANS_EMAIL',
                "Des comptes actifs n'ont pas d'adresse e-mail : ils ne peuvent pas recevoir le code de connexion.",
                sans_email)

    en_attente = sum(1 for u in actifs.only('password') if not u.has_usable_password())
    if en_attente:
        ajouter('info', 'MOT_DE_PASSE_A_DEFINIR',
                "Des comptes attendent que leur titulaire définisse son mot de passe via le lien reçu.", en_attente)

    depuis = timezone.now() - timedelta(hours=24)
    echecs = JournalActivite.objects.filter(date__gte=depuis, operation__in=OPERATIONS_ECHEC_CONNEXION)
    comptes_cibles = (echecs.exclude(cible=None).values('cible_username')
                      .annotate(n=Count('id')).filter(n__gte=SEUIL_ECHECS_24H).count())
    if comptes_cibles:
        ajouter('critique', 'ECHECS_REPETES',
                f"Des comptes cumulent au moins {SEUIL_ECHECS_24H} échecs de connexion sur les dernières 24 h : consultez le journal de sécurité.",
                comptes_cibles)
    inconnus = echecs.filter(cible=None).count()
    if inconnus >= SEUIL_ECHECS_24H:
        ajouter('attention', 'IDENTIFIANTS_INCONNUS',
                "Nombreuses tentatives de connexion avec des identifiants inexistants sur les dernières 24 h.", inconnus)
    return alertes


class StatistiquesAdminView(EnFrancais, APIView):
    """Indicateurs du tableau de bord administrateur, calculés sur les données réelles."""
    permission_classes = [EstAdministrateurSysteme]

    @extend_schema(tags=['Administration'], summary="Statistiques globales des comptes et des demandes", responses=OpenApiTypes.OBJECT)
    def get(self, request):
        comptes = Utilisateur.objects.all()
        total = comptes.count()
        actifs = comptes.filter(is_active=True).count()
        par_role = [
            {'role': ligne['role'], 'libelle': libelle_role(ligne['role']),
             'obsolete': ligne['role'] not in Role.values,
             'total': ligne['total'], 'actifs': ligne['actifs']}
            for ligne in comptes.values('role').annotate(
                total=Count('id'), actifs=Count('id', filter=Q(is_active=True))
            ).order_by('-total', 'role')
        ]
        recentes = JournalActivite.objects.filter(categorie=JournalActivite.Categorie.ADMINISTRATION)[:10]
        depuis = timezone.now() - timedelta(hours=24)
        return Response({
            'total': total,
            'actifs': actifs,
            'inactifs': total - actifs,
            'par_role': par_role,
            'connexions_24h': JournalActivite.objects.filter(
                date__gte=depuis, operation=Operation.CONNEXION_REUSSIE).count(),
            'echecs_connexion_24h': JournalActivite.objects.filter(
                date__gte=depuis, operation__in=OPERATIONS_ECHEC_CONNEXION).count(),
            'actions_recentes': JournalActiviteSerializer(recentes, many=True).data,
            'alertes': alertes_securite(),
        })


# Périmètre de visibilité, tel qu'appliqué par demandes_visibles_par
PERIMETRES = {
    Role.SCOLARITE_ETABLISSEMENT: "Demandes de son établissement de rattachement (aucune si non rattaché).",
    Role.SCOLARITE_CENTRALE: "Toutes les demandes.",
    Role.CHEF_SERVICE: "Demandes transmises par la Scolarité centrale.",
    Role.IMPRIMEUR: "Demandes qui lui sont affectées, et file d'impression non affectée.",
    Role.AGENT_TRANSMISSION: "Diplômes qui lui sont confiés, et transmissions non affectées.",
    Role.PRESIDENCE: "Toutes les demandes (consultation), signature présidentielle.",
    Role.ADMIN_SYSTEME: "Aucune demande : gestion des comptes, des rôles et consultation des journaux.",
}


class RolesAdminView(EnFrancais, APIView):
    """Référentiel des rôles, calculé depuis les règles réellement appliquées par le backend."""
    permission_classes = [EstAdministrateurSysteme]

    @extend_schema(tags=['Administration'], summary="Rôles et transitions autorisées du circuit", responses=OpenApiTypes.OBJECT)
    def get(self, request):
        effectifs = {
            ligne['role']: ligne for ligne in Utilisateur.objects.values('role').annotate(
                total=Count('id'), actifs=Count('id', filter=Q(is_active=True)))
        }
        roles = []
        for code, libelle in Role.choices:
            actions = []
            if code in ROLES_CREATION_DEMANDE:
                actions.append("Enregistrer une demande (dossier physique)")
            actions += [t['label'] for t in TRANSITIONS_AUTORISEES.values() if code in t['roles']]
            if code == Role.ADMIN_SYSTEME:
                actions = ["Gérer les comptes utilisateurs", "Attribuer les rôles",
                           "Activer / désactiver les comptes", "Réinitialiser les accès",
                           "Consulter les journaux d'activité et de sécurité"]
            ligne = effectifs.get(code, {})
            roles.append({
                'code': code,
                'libelle': libelle,
                'attribuable': code in Utilisateur.ROLES_ATTRIBUABLES,
                'acces_demandes': code in Utilisateur.ROLES_METIER,
                'perimetre': PERIMETRES.get(code, ''),
                'actions': actions,
                'total': ligne.get('total', 0),
                'actifs': ligne.get('actifs', 0),
            })
        return Response(roles)


class SecuriteAdminView(EnFrancais, APIView):
    """Paramètres de sécurité effectivement appliqués (consultation seule, aucun secret)."""
    permission_classes = [EstAdministrateurSysteme]

    @extend_schema(tags=['Administration'], summary="Alertes et paramètres de sécurité", responses=OpenApiTypes.OBJECT)
    def get(self, request):
        validateurs = []
        for validateur in get_default_password_validators():
            validateurs.append(validateur.get_help_text())
        backend = settings.EMAIL_BACKEND.rsplit('.', 2)[-2] if '.' in settings.EMAIL_BACKEND else settings.EMAIL_BACKEND
        return Response({
            'authentification': {
                'double_authentification': True,
                'otp_validite_minutes': OTPCode.OTP_VALIDITY_MINUTES,
                'otp_tentatives_max': OTPCode.MAX_TENTATIVES,
                'jwt_acces_minutes': int(jwt_settings.ACCESS_TOKEN_LIFETIME.total_seconds() // 60),
                'jwt_rafraichissement_heures': int(jwt_settings.REFRESH_TOKEN_LIFETIME.total_seconds() // 3600),
            },
            'mots_de_passe': {
                'validateurs': validateurs,
                'lien_validite_heures': settings.PASSWORD_RESET_TIMEOUT // 3600,
            },
            'messagerie': {
                'mode_envoi': backend,
                'expediteur': settings.DEFAULT_FROM_EMAIL,
            },
            'environnement': {
                'debug': settings.DEBUG,
                'alertes': alertes_securite(),
            },
        })


def representer_equipe(role, libelle, adresse):
    return {
        'role': role,
        'libelle': libelle,
        'email': adresse.email if adresse else '',
        'actif': adresse.actif if adresse else False,
        'configuree': adresse is not None,
        'date_modification': adresse.date_modification if adresse else None,
        'modifie_par': adresse.modifie_par.username if adresse and adresse.modifie_par else '',
        'membres_actifs': Utilisateur.objects.filter(role=role, is_active=True).count(),
    }


class EquipesNotificationView(EnFrancais, APIView):
    """Adresses de notification des cinq équipes métier (configurées ou non)."""
    permission_classes = [EstAdministrateurSysteme]

    @extend_schema(tags=['Administration'], summary="Adresses de notification des équipes", responses=OpenApiTypes.OBJECT)
    def get(self, request):
        adresses = {a.role: a for a in AdresseNotificationEquipe.objects.select_related('modifie_par')}
        return Response([
            representer_equipe(role, libelle, adresses.get(role))
            for role, libelle in AdresseNotificationEquipe.EQUIPES
        ])


class EquipeNotificationDetailView(EnFrancais, APIView):
    """Définition (création ou mise à jour) de l'adresse d'une équipe."""
    permission_classes = [EstAdministrateurSysteme]

    def get_libelle(self, role):
        libelle = dict(AdresseNotificationEquipe.EQUIPES).get(role)
        if libelle is None:
            raise NotFound("Équipe inconnue.")
        return libelle

    @extend_schema(tags=['Administration'], summary="Définit l'adresse de notification d'une équipe",
                   request=AdresseEquipeSerializer, responses=OpenApiTypes.OBJECT)
    @transaction.atomic
    def put(self, request, role):
        libelle = self.get_libelle(role)
        serializer = AdresseEquipeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        adresse = AdresseNotificationEquipe.objects.select_for_update().filter(role=role).first()
        avant = {'email': adresse.email, 'actif': adresse.actif} if adresse else None
        if adresse is None:
            adresse = AdresseNotificationEquipe(role=role)
        adresse.email = serializer.validated_data['email']
        adresse.actif = serializer.validated_data['actif']
        adresse.modifie_par = request.user
        adresse.save()
        apres = {'email': adresse.email, 'actif': adresse.actif}
        if apres != avant:
            journaliser(Operation.ADRESSE_EQUIPE_MODIFIEE, auteur=request.user, request=request, details={
                'equipe': role,
                'ancienne_adresse': avant['email'] if avant else None,
                'nouvelle_adresse': adresse.email,
                'envoi_active': adresse.actif,
            })
        return Response(representer_equipe(role, libelle, adresse))


class EquipeNotificationTestView(EnFrancais, APIView):
    """Envoie un message de test à l'adresse d'une équipe (vérifie la configuration de messagerie)."""
    permission_classes = [EstAdministrateurSysteme]

    @extend_schema(tags=['Administration'], summary="Envoie un message de test à une équipe", request=None, responses=OpenApiTypes.OBJECT)
    def post(self, request, role):
        adresse = AdresseNotificationEquipe.objects.filter(role=role).first()
        if adresse is None:
            raise NotFound("Aucune adresse n'est configurée pour cette équipe.")
        envoye = envoyer_email_equipe(
            adresse, "Message de test",
            f"Ce message de test a été envoyé par l'administrateur {request.user.username} "
            f"pour vérifier la réception des notifications de l'équipe {adresse.get_role_display()}."
        )
        if not envoye:
            return Response({'envoye': False, 'detail': "L'envoi a échoué : vérifiez la configuration de messagerie (SMTP)."},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response({'envoye': True, 'detail': f"Message de test envoyé à {adresse.email}."})
