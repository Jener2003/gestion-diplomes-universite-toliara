import re

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Count, Q
from django.db import transaction

from .models import DemandeDiplome, Historique
from .serializers import DemandeDiplomeSerializer, HistoriqueSerializer
from notifications.models import Notification
from administration.services import notifier_equipe_par_email
from utilisateurs.models import Utilisateur, Etudiant

Statut = DemandeDiplome.Statut


def create_notification_for_role(role, titre, message, user_target=None):
    """Envoie une notification aux utilisateurs d'un rôle ou à un utilisateur spécifique."""
    if user_target:
        Notification.objects.create(
            utilisateur=user_target,
            titre=titre,
            message=message,
            type_notification='INFO'
        )
    else:
        users = Utilisateur.objects.filter(role=role, is_active=True)
        for u in users:
            Notification.objects.create(
                utilisateur=u,
                titre=titre,
                message=message,
                type_notification='INFO'
            )
        # Copie à l'adresse fonctionnelle de l'équipe, si l'administrateur l'a configurée
        notifier_equipe_par_email(role, titre, message)


def notifier_etablissement(demande, titre, message):
    """Notifie uniquement la Scolarité de l'établissement concerné par la demande."""
    faculte = (demande.etudiant.faculte or '').strip().lower()
    origine = (demande.etablissement_origine or '').strip().lower()
    users = Utilisateur.objects.filter(role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT, is_active=True)
    for u in users:
        etab = (u.etablissement or '').strip().lower()
        if etab and etab in (faculte, origine):
            create_notification_for_role(None, titre, message, user_target=u)


def demandes_visibles_par(user, queryset=None):
    """
    Cloisonnement RBAC : demandes qu'un utilisateur a le droit de voir.
    Source unique utilisée par la liste, les statistiques et l'historique,
    afin que les compteurs correspondent toujours aux listes affichées.
    """
    if queryset is None:
        queryset = DemandeDiplome.objects.all()

    if user.role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT:
        # Correspondance exacte : « Lettres » ne doit pas voir « Lettres modernes »
        if not user.etablissement:
            return queryset.none()
        queryset = queryset.filter(
            Q(etudiant__faculte__iexact=user.etablissement) |
            Q(etablissement_origine__iexact=user.etablissement)
        )
    elif user.role == Utilisateur.Role.IMPRIMEUR:
        queryset = queryset.filter(
            Q(imprimeur_assigne=user) |
            Q(imprimeur_assigne__isnull=True, statut__in=[
                Statut.EN_ATTENTE_IMPRESSION,
                Statut.EN_IMPRESSION,
                Statut.IMPRIME
            ])
        )
    elif user.role == Utilisateur.Role.AGENT_TRANSMISSION:
        queryset = queryset.filter(
            Q(agent_transmission=user) |
            Q(agent_transmission__isnull=True, statut__in=[
                Statut.EN_TRANSMISSION_PRESIDENT,
                Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
                Statut.SIGNE_PRESIDENT,
                Statut.RETOUR_SCOLARITE
            ])
        )
    elif user.role == Utilisateur.Role.CHEF_SERVICE:
        queryset = queryset.filter(date_transmission_chef__isnull=False)
    elif user.role not in (Utilisateur.Role.SCOLARITE_CENTRALE, Utilisateur.Role.PRESIDENCE):
        # Refus par défaut : rôle inconnu ou obsolète (ex. ancien rôle ETUDIANT)
        return queryset.none()
    return queryset


# Rôles habilités à enregistrer un dossier physique au guichet
ROLES_CREATION_DEMANDE = (
    Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
    Utilisateur.Role.CHEF_SERVICE,
    Utilisateur.Role.SCOLARITE_CENTRALE,
)


def parse_bool(value):
    return str(value).lower() in ('true', '1', 'yes', 'on')


# Matrice complète des transitions du circuit administratif réel à 9 étapes
TRANSITIONS_AUTORISEES = {
    # ── Étape 3 : Scolarité Centrale ──────────────────────────────────────────
    'VALIDER_SCOLARITE_CENTRALE': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE],
        'depuis': [Statut.EN_ATTENTE_VERIFICATION, Statut.DOSSIER_INCOMPLET],
        'nouveau_statut': Statut.VALIDEE,
        'label': 'Valider la conformité du dossier'
    },
    'TRANSMETTRE_CHEF': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE],
        'depuis': [Statut.VALIDEE],
        'nouveau_statut': Statut.VALIDEE,
        'label': 'Transmettre le dossier au Chef de service'
    },
    'REFUSER': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE],
        'depuis': [Statut.EN_ATTENTE_VERIFICATION, Statut.DOSSIER_INCOMPLET, Statut.VALIDEE],
        'nouveau_statut': Statut.REFUSEE,
        'label': 'Refuser la demande'
    },

    # ── Étape 4 : Chef de Service des Diplômes ─────────────────────────────────
    'PRENDRE_EN_CHARGE': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.VALIDEE],
        'nouveau_statut': Statut.EN_TRAITEMENT,
        'label': 'Prendre en charge le dossier'
    },
    'AFFECTER_IMPRIMEUR': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.VALIDEE, Statut.EN_TRAITEMENT],
        'nouveau_statut': Statut.EN_ATTENTE_IMPRESSION,
        'label': 'Affecter à un imprimeur'
    },

    # ── Étape 5 : Concepteur / Imprimeur ──────────────────────────────────────
    'LANCER_IMPRESSION': {
        'roles': [Utilisateur.Role.IMPRIMEUR],
        'depuis': [Statut.EN_ATTENTE_IMPRESSION],
        'nouveau_statut': Statut.EN_IMPRESSION,
        'label': 'Démarrer l\'impression'
    },
    'TERMINER_IMPRESSION': {
        'roles': [Utilisateur.Role.IMPRIMEUR],
        'depuis': [Statut.EN_IMPRESSION, Statut.EN_ATTENTE_IMPRESSION],
        'nouveau_statut': Statut.IMPRIME,
        'label': 'Déclarer impression terminée'
    },

    'CONFIER_TRANSMISSION_PRESIDENT': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.IMPRIME],
        'nouveau_statut': Statut.EN_TRANSMISSION_PRESIDENT,
        'label': 'Confier à l\'agent de transmission vers Présidence'
    },
    'REMETTRE_PRESIDENCE': {
        'roles': [Utilisateur.Role.AGENT_TRANSMISSION],
        'depuis': [Statut.EN_TRANSMISSION_PRESIDENT],
        'nouveau_statut': Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
        'label': 'Enregistrer remise au secrétariat de la Présidence'
    },

    # ── Étape 8 : Signature du Président de l'Université ───────────────────────
    'SIGNER_PRESIDENT': {
        'roles': [Utilisateur.Role.PRESIDENCE],
        'depuis': [Statut.EN_ATTENTE_SIGNATURE_PRESIDENT],
        'nouveau_statut': Statut.SIGNE_PRESIDENT,
        'label': 'Apposer signature présidentielle'
    },

    # ── Étape 9 : Retour & Retrait final ──────────────────────────────────────
    'ACHEMINER_RETOUR': {
        'roles': [Utilisateur.Role.AGENT_TRANSMISSION],
        'depuis': [Statut.SIGNE_PRESIDENT],
        'nouveau_statut': Statut.RETOUR_SCOLARITE,
        'label': 'Acheminer le diplôme signé en retour vers le Chef de service'
    },
}


class DemandeDiplomeViewSet(viewsets.ModelViewSet):
    queryset = DemandeDiplome.objects.all().order_by('-date_demande')
    serializer_class = DemandeDiplomeSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ROLES_CREATION_DEMANDE:
            return Response(
                {'error': "Vous n'êtes pas autorisé à créer une demande de diplôme."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        etudiant_id = data.get('etudiant')
        
        matricule = data.get('matricule', '').strip().upper()
        if not etudiant_id and matricule:
            etudiant, _ = Etudiant.objects.get_or_create(
                matricule=matricule,
                defaults={
                    'nom': data.get('nom', '').strip().upper(),
                    'prenom': data.get('prenom', '').strip(),
                    'cin': data.get('cin', matricule).strip(),
                    'date_naissance': data.get('date_naissance', '2000-01-01'),
                    'faculte': data.get('faculte', user.etablissement or 'Domaine des Sciences et Technologie'),
                    'filiere': data.get('filiere', 'Générale'),
                    'niveau_etude': data.get('niveau_etude', 'Master 2'),
                }
            )
            data['etudiant'] = etudiant.id

        data.pop('statut', None)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        etablissement_nom = user.etablissement or data.get('faculte') or 'Établissement'
        demande = serializer.save(
            statut=Statut.EN_ATTENTE_VERIFICATION,
            agent_responsable=user,
            etablissement_origine=etablissement_nom
        )

        Historique.objects.create(
            demande=demande,
            utilisateur=user,
            role_utilisateur=user.role,
            action_realisee=f"Dossier physique saisi au guichet par {user.get_role_display()} ({user.username})",
            ancien_statut=None,
            nouveau_statut=Statut.EN_ATTENTE_VERIFICATION,
            commentaire=data.get('observations', 'Dossier complet remis au guichet.')
        )

        # Notification automatique à la Scolarité Centrale
        create_notification_for_role(
            role=Utilisateur.Role.SCOLARITE_CENTRALE,
            titre=f"Nouveau dossier en attente (#{demande.id})",
            message=f"Le dossier de {demande.etudiant.nom} {demande.etudiant.prenom} ({demande.etudiant.matricule}) de {demande.etablissement_origine} est en attente de vérification."
        )

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(demande).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        return Response(
            {'error': "Modification directe non autorisée. Utilisez l'action passer_etape."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    partial_update = update

    def destroy(self, request, *args, **kwargs):
        return Response({'error': 'Suppression non autorisée.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return DemandeDiplome.objects.none()

        # Filtrage strict par rôle pour le cloisonnement RBAC
        queryset = demandes_visibles_par(user, queryset)

        # Filtres génériques (recherche, statut, dates, faculté)
        statut_filter = self.request.query_params.get('statut', None)
        search_filter = self.request.query_params.get('search', None)
        faculte_filter = self.request.query_params.get('faculte', None)
        filiere_filter = self.request.query_params.get('filiere', None)
        date_debut_filter = self.request.query_params.get('date_debut', None)
        date_fin_filter = self.request.query_params.get('date_fin', None)

        if statut_filter:
            queryset = queryset.filter(statut=statut_filter)
        if faculte_filter:
            queryset = queryset.filter(etudiant__faculte__icontains=faculte_filter)
        if filiere_filter:
            queryset = queryset.filter(etudiant__filiere__icontains=filiere_filter)
        # Comparaison sur la date seule : la date de fin est incluse en entier
        if date_debut_filter:
            queryset = queryset.filter(date_demande__date__gte=date_debut_filter)
        if date_fin_filter:
            queryset = queryset.filter(date_demande__date__lte=date_fin_filter)
        if search_filter:
            critere = (
                Q(etudiant__matricule__icontains=search_filter) |
                Q(etudiant__nom__icontains=search_filter) |
                Q(etudiant__prenom__icontains=search_filter) |
                Q(type_diplome__icontains=search_filter)
            )
            # Recherche par la référence affichée : « DEM-012 », « dem12 » ou « 12 »
            ref = re.sub(r'^dem-?', '', search_filter.strip(), flags=re.IGNORECASE)
            if ref.isdigit():
                critere |= Q(id=int(ref))
            queryset = queryset.filter(critere)
        return queryset

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def passer_etape(self, request, pk=None):
        demande = self.get_object()
        action_type = request.data.get('action')
        observations = request.data.get('observations', '').strip()
        mention = request.data.get('mention', '').strip()
        imprimeur_id = request.data.get('imprimeur_id')
        agent_transmission_id = request.data.get('agent_transmission_id')
        user = request.user

        if user.role == Utilisateur.Role.PRESIDENCE and action_type != 'SIGNER_PRESIDENT':
            return Response(
                {'error': 'Le compte Présidence dispose d’un accès en consultation uniquement, hormis la confirmation de signature.'},
                status=status.HTTP_403_FORBIDDEN
            )

        transition = TRANSITIONS_AUTORISEES.get(action_type)
        if transition is None:
            return Response(
                {'error': f"Action '{action_type}' non reconnue."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if action_type == 'TRANSMETTRE_CHEF':
            demande = DemandeDiplome.objects.select_for_update().get(pk=demande.pk)

        if user.role not in transition['roles'] and not user.is_superuser:
            return Response(
                {'error': f"Votre profil ({user.get_role_display()}) n'est pas habilité à effectuer l'action '{transition['label']}'."},
                status=status.HTTP_403_FORBIDDEN
            )

        if demande.statut not in transition['depuis']:
            return Response(
                {'error': f"Action impossible : le dossier est actuellement à l'état '{demande.get_statut_display()}'."},
                status=status.HTTP_409_CONFLICT
            )

        if action_type == 'PRENDRE_EN_CHARGE' and not demande.date_transmission_chef:
            return Response(
                {'error': 'Ce dossier n’a pas encore été transmis par la Scolarité centrale.'},
                status=status.HTTP_409_CONFLICT
            )

        if action_type == 'TRANSMETTRE_CHEF' and demande.date_transmission_chef:
            return Response(
                {'error': 'Ce dossier a déjà été transmis au Chef de service.'},
                status=status.HTTP_409_CONFLICT
            )

        # Une fois transmis au Chef de service, le dossier ne relève plus de la Scolarité centrale
        if (user.role == Utilisateur.Role.SCOLARITE_CENTRALE and action_type == 'REFUSER'
                and demande.date_transmission_chef):
            return Response(
                {'error': 'Ce dossier a déjà été transmis au Chef de service : seul celui-ci peut le refuser.'},
                status=status.HTTP_409_CONFLICT
            )

        # Seul l'imprimeur / l'agent désigné peut traiter un dossier qui lui est affecté
        if (action_type in ('LANCER_IMPRESSION', 'TERMINER_IMPRESSION')
                and demande.imprimeur_assigne_id and demande.imprimeur_assigne_id != user.id
                and not user.is_superuser):
            return Response(
                {'error': 'Ce dossier est affecté à un autre imprimeur.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if (action_type in ('REMETTRE_PRESIDENCE', 'ACHEMINER_RETOUR')
                and user.role == Utilisateur.Role.AGENT_TRANSMISSION
                and demande.agent_transmission_id and demande.agent_transmission_id != user.id):
            return Response(
                {'error': 'Ce dossier est confié à un autre agent de transmission.'},
                status=status.HTTP_403_FORBIDDEN
            )

        imp_user = None
        if action_type == 'AFFECTER_IMPRIMEUR' and imprimeur_id:
            imp_user = Utilisateur.objects.filter(
                id=imprimeur_id, role=Utilisateur.Role.IMPRIMEUR, is_active=True
            ).first()
            if imp_user is None:
                return Response({'error': 'Imprimeur sélectionné introuvable ou inactif.'},
                                status=status.HTTP_400_BAD_REQUEST)
        ag_user = None
        if action_type == 'CONFIER_TRANSMISSION_PRESIDENT' and agent_transmission_id:
            ag_user = Utilisateur.objects.filter(
                id=agent_transmission_id, role=Utilisateur.Role.AGENT_TRANSMISSION, is_active=True
            ).first()
            if ag_user is None:
                return Response({'error': 'Agent de transmission sélectionné introuvable ou inactif.'},
                                status=status.HTTP_400_BAD_REQUEST)

        ancien_statut = demande.statut
        nouveau_statut = transition['nouveau_statut']
        action_desc = f"{transition['label']} par {user.get_role_display()} ({user.username})"

        # ── Traitement spécifique selon l'action ──────────────────────────────
        # La check-list des pièces n'est modifiable que lors de l'examen par la Scolarité centrale
        if action_type in ('VALIDER_SCOLARITE_CENTRALE', 'REFUSER') \
                and user.role == Utilisateur.Role.SCOLARITE_CENTRALE:
            for champ in ('has_pv_soutenance', 'has_releve_notes',
                          'has_certificat_scolarite', 'has_recu_bancaire', 'admission_etudiant'):
                if champ in request.data:
                    setattr(demande, champ, parse_bool(request.data.get(champ)))

        if action_type == 'VALIDER_SCOLARITE_CENTRALE':
            pieces_ok = all([demande.has_pv_soutenance, demande.has_releve_notes,
                             demande.has_certificat_scolarite, demande.has_recu_bancaire])
            if not pieces_ok:
                return Response({'error': 'Validation impossible : les 4 pièces justificatives doivent être conformes.'},
                                status=status.HTTP_400_BAD_REQUEST)
            if demande.admission_etudiant is not True:
                return Response({'error': "Validation impossible : l'admission de l'étudiant doit être confirmée."},
                                status=status.HTTP_400_BAD_REQUEST)
            demande.observations = observations or "Dossier et conformité académique validés."

        elif action_type == 'TRANSMETTRE_CHEF':
            demande.date_transmission_chef = timezone.now()
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Nouveau dossier transmis (#{demande.id})",
                message=f"Le dossier de {demande.etudiant.nom} {demande.etudiant.prenom} ({demande.etudiant.matricule}) est transmis par la Scolarité Centrale.",
            )

        elif action_type == 'REFUSER':
            demande.observations = observations or "Demande refusée lors de l'examen de conformité."
            action_desc = f"Demande refusée par {user.get_role_display()} ({user.username}). Motif : {demande.observations}"
            notifier_etablissement(
                demande,
                titre=f"Dossier #{demande.id} refusé",
                message=f"Le dossier de {demande.etudiant.matricule} a été refusé : {demande.observations}"
            )

        elif action_type == 'AFFECTER_IMPRIMEUR':
            demande.imprimeur_assigne = imp_user
            if imp_user:
                create_notification_for_role(
                    role=Utilisateur.Role.IMPRIMEUR,
                    titre="Nouvelle demande d'impression assignée",
                    message=f"Le dossier #{demande.id} ({demande.etudiant.nom} {demande.etudiant.prenom}) vous a été affecté.",
                    user_target=imp_user
                )
            else:
                create_notification_for_role(
                    role=Utilisateur.Role.IMPRIMEUR,
                    titre="Nouvelle demande d'impression disponible",
                    message=f"Le dossier #{demande.id} ({demande.etudiant.matricule}) est prêt pour impression."
                )

        elif action_type == 'TERMINER_IMPRESSION':
            demande.date_impression = timezone.now()
            from diplomes.models import Diplome
            Diplome.objects.get_or_create(
                demande=demande,
                defaults={
                    'numero_diplome': Diplome.generer_numero(demande.date_impression.year),
                    'code_verification': Diplome.generer_code_verification(),
                }
            )
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Impression terminée (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.nom} {demande.etudiant.prenom} a été imprimé."
            )

        elif action_type == 'CONFIER_TRANSMISSION_PRESIDENT':
            demande.date_transmission_president = timezone.now()
            demande.agent_transmission = ag_user
            if ag_user:
                create_notification_for_role(
                    role=Utilisateur.Role.AGENT_TRANSMISSION,
                    titre="Diplôme à acheminer à la Présidence",
                    message=f"Le diplôme #{demande.id} vous est confié pour transmission à la Présidence.",
                    user_target=ag_user
                )
            else:
                create_notification_for_role(
                    role=Utilisateur.Role.AGENT_TRANSMISSION,
                    titre="Diplôme à acheminer à la Présidence",
                    message=f"Le diplôme #{demande.id} ({demande.etudiant.matricule}) est prêt pour acheminement."
                )

        elif action_type == 'REMETTRE_PRESIDENCE':
            create_notification_for_role(
                role=Utilisateur.Role.PRESIDENCE,
                titre="Diplôme en attente de signature",
                message=f"Le diplôme #{demande.id} de {demande.etudiant.nom} {demande.etudiant.prenom} ({demande.type_diplome}) est déposé pour votre signature."
            )

        elif action_type == 'SIGNER_PRESIDENT':
            demande.date_signature_president = timezone.now()
            from diplomes.models import Diplome
            diplome = getattr(demande, 'diplome', None)
            if diplome:
                diplome.date_delivrance = demande.date_signature_president.date()
                if mention:
                    diplome.mention = mention
                diplome.save()
            create_notification_for_role(
                role=Utilisateur.Role.AGENT_TRANSMISSION,
                titre=f"Diplôme signé par le Président (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.matricule} est signé et prêt pour retour vers le Chef de service."
            )
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Diplôme signé par la Présidence (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.matricule} a été signé."
            )

        elif action_type == 'ACHEMINER_RETOUR':
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Diplôme en retour (#{demande.id})",
                message=f"Le diplôme officiel de {demande.etudiant.matricule} a été acheminé en retour au Chef de service."
            )

        demande.statut = nouveau_statut
        demande.agent_responsable = user
        demande.save()

        # Enregistrement systématique dans l'historique d'audit
        Historique.objects.create(
            demande=demande,
            utilisateur=user,
            role_utilisateur=user.role,
            action_realisee=action_desc,
            ancien_statut=ancien_statut,
            nouveau_statut=nouveau_statut,
            commentaire=observations or None
        )

        return Response(DemandeDiplomeSerializer(demande).data)

    @action(detail=False, methods=['get'])
    def archives(self, request):
        if request.user.role != Utilisateur.Role.SCOLARITE_CENTRALE:
            return Response({'error': 'Accès réservé à la Scolarité centrale.'}, status=status.HTTP_403_FORBIDDEN)
        queryset = self.filter_queryset(self.get_queryset()).filter(date_transmission_chef__isnull=False)
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats_overview(self, request):
        # Même périmètre que la liste : les compteurs correspondent aux dossiers visibles
        base_qs = demandes_visibles_par(request.user)

        total = base_qs.count()
        en_attente_verif = base_qs.filter(statut=Statut.EN_ATTENTE_VERIFICATION).count()
        dossier_incomplet = base_qs.filter(statut=Statut.DOSSIER_INCOMPLET).count()
        refusees = base_qs.filter(statut=Statut.REFUSEE).count()
        validees = base_qs.filter(statut=Statut.VALIDEE).count()
        
        # Total des demandes validées par la scolarité centrale (qui continuent leur cycle aval)
        validees_total = base_qs.exclude(statut__in=[
            Statut.EN_ATTENTE_VERIFICATION, 
            Statut.DOSSIER_INCOMPLET, 
            Statut.REFUSEE
        ]).count()
        en_attente_total = en_attente_verif + dossier_incomplet

        en_traitement = base_qs.filter(statut=Statut.EN_TRAITEMENT).count()
        en_attente_imp = base_qs.filter(statut=Statut.EN_ATTENTE_IMPRESSION).count()
        en_impression = base_qs.filter(statut=Statut.EN_IMPRESSION).count()
        imprimees = base_qs.filter(statut=Statut.IMPRIME).count()
        en_trans_pres = base_qs.filter(statut=Statut.EN_TRANSMISSION_PRESIDENT).count()
        attente_sig_pres = base_qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).count()
        signees_pres = base_qs.filter(statut=Statut.SIGNE_PRESIDENT).count()
        retour_scol = base_qs.filter(statut=Statut.RETOUR_SCOLARITE).count()
        refusees = base_qs.filter(statut=Statut.REFUSEE).count()

        facultes = list(base_qs.values('etudiant__faculte').annotate(count=Count('id')).order_by('-count'))

        return Response({
            'total': total,
            'en_attente_total': en_attente_total,
            'validees_total': validees_total,
            'en_attente_verif': en_attente_verif,
            'dossier_incomplet': dossier_incomplet,
            'validees': validees,
            'en_traitement': en_traitement,
            'en_attente_imp': en_attente_imp,
            'en_impression': en_impression,
            'imprimees': imprimees,
            'en_trans_pres': en_trans_pres,
            'attente_sig_pres': attente_sig_pres,
            'signees_pres': signees_pres,
            'retour_scol': retour_scol,
            'refusees': refusees,
            'facultes': facultes
        })

    @action(detail=False, methods=['get'])
    def kpi_presidence(self, request):
        if request.user.role not in [Utilisateur.Role.PRESIDENCE, Utilisateur.Role.CHEF_SERVICE]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            
        demandes = DemandeDiplome.objects.filter(date_signature_president__isnull=False)
        total_time_seconds = 0
        count = 0
        for d in demandes:
            diff = d.date_signature_president - d.date_demande
            total_time_seconds += diff.total_seconds()
            count += 1
            
        avg_seconds = total_time_seconds / count if count > 0 else 0
        avg_days = avg_seconds / (3600 * 24)
        
        return Response({
            'total_diplomes_signes': count,
            'delai_moyen_signature_jours': round(avg_days, 1),
            'en_attente_signature': DemandeDiplome.objects.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).count(),
            'signes_president': DemandeDiplome.objects.filter(statut__in=[Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE]).count()
        })


class HistoriqueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Historique.objects.all().order_by('-date_action')
    serializer_class = HistoriqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Historique limité aux dossiers que l'utilisateur a le droit de voir
        return super().get_queryset().filter(demande__in=demandes_visibles_par(self.request.user))
