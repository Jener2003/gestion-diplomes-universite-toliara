import secrets

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from core.openapi import OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.db import transaction
from django.conf import settings
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import RefreshToken

from administration.models import JournalActivite
from administration.services import adresse_codes, journaliser, masquer_adresse
from .langue import EnFrancais
from .models import Utilisateur, OTPCode

Operation = JournalActivite.Operation


def nouveau_code(user):
    """Invalide les codes précédents de l'agent et en crée un nouveau."""
    OTPCode.objects.filter(utilisateur=user, is_used=False).update(is_used=True)
    code = OTPCode.generate_code()
    OTPCode.objects.create(utilisateur=user, code=code)
    return code


def envoyer_code(user, code, *, objet, raison):
    """
    Envoie un code de vérification à l'adresse commune de l'espace de l'agent
    (à défaut, à son adresse personnelle). Retourne l'adresse masquée.
    """
    destinataire = adresse_codes(user)
    message = (
        f"Bonjour,\n\n"
        f"{raison}\n\n"
        f"Identifiant concerné : {user.username} ({user.get_full_name() or 'sans nom'})\n"
        f"Code de vérification :\n\n"
        f"    {code}\n\n"
        f"Ce code est valable pendant {OTPCode.OTP_VALIDITY_MINUTES} minutes. "
        f"Ne le communiquez qu'à la personne concernée.\n"
        f"Si personne de votre équipe n'est à l'origine de cette demande, ignorez ce message "
        f"et prévenez l'administrateur.\n\n"
        f"Université de Toliara — Système de Gestion des Diplômes"
    )
    if destinataire:
        send_mail(objet, message, settings.DEFAULT_FROM_EMAIL, [destinataire], fail_silently=False)
        return masquer_adresse(destinataire)
    # Aucune adresse configurée : code affiché dans la console du serveur (développement)
    print(f"\n{'='*50}\n[2FA] Code pour {user.username}: {code}\n{'='*50}\n")
    return '(console — aucune adresse configurée)'


class LoginStep1View(APIView):
    """
    Étape 1 de la 2FA : vérifie username/password, génère un OTP et l'envoie par email.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['Authentification'],
        summary="Étape 1 : identifiant et mot de passe (envoie le code OTP par e-mail)",
        request=inline_serializer('ConnexionEtape1', {
            'username': serializers.CharField(),
            'password': serializers.CharField(),
        }),
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response(
                {'detail': 'Nom d\'utilisateur et mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            # Seul un identifiant existant est enregistré : un identifiant inconnu
            # peut être un mot de passe saisi dans le mauvais champ.
            compte = Utilisateur.objects.filter(username=username).first()
            # Inscription non terminée : message explicite, seulement si le mot de passe est juste
            if compte is not None and compte.inscription and compte.check_password(password):
                journaliser(Operation.CONNEXION_COMPTE_DESACTIVE, cible=compte, request=request,
                            details={'etape': 'identifiants', 'inscription': compte.inscription})
                message = (
                    "Votre inscription n'est pas terminée : saisissez le code envoyé à l'adresse de votre "
                    "espace, ou inscrivez-vous de nouveau pour recevoir un nouveau code."
                    if compte.inscription == Utilisateur.Inscription.CODE_A_CONFIRMER else
                    "Votre compte est en attente de validation par l'administrateur."
                )
                return Response({'detail': message, 'inscription': compte.inscription},
                                status=status.HTTP_403_FORBIDDEN)
            if compte is not None and not compte.is_active:
                journaliser(Operation.CONNEXION_COMPTE_DESACTIVE, cible=compte, request=request,
                            details={'etape': 'identifiants'})
            else:
                journaliser(Operation.ECHEC_MOT_DE_PASSE, cible=compte, request=request,
                            details={'compte_existant': compte is not None})
            return Response(
                {'detail': 'Identifiants incorrects.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            journaliser(Operation.CONNEXION_COMPTE_DESACTIVE, cible=user, request=request,
                        details={'etape': 'identifiants'})
            return Response(
                {'detail': 'Ce compte est désactivé.'},
                status=status.HTTP_403_FORBIDDEN
            )

        code = nouveau_code(user)
        masked = envoyer_code(
            user, code, objet='Code de connexion - Université de Toliara',
            raison="Une connexion à la plateforme de gestion des diplômes est en cours.",
        )

        resp_data = {
            'otp_required': True,
            'username': username,
            'email_hint': masked,
            'message': f'Un code de vérification a été envoyé à {masked}.'
        }
        if settings.DEBUG:
            resp_data['dev_otp_code'] = code

        return Response(resp_data, status=status.HTTP_200_OK)


class LoginStep2View(APIView):
    """
    Étape 2 de la 2FA : vérifie le code OTP et retourne les tokens JWT.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['Authentification'],
        summary="Étape 2 : vérification du code OTP (délivre les jetons JWT)",
        request=inline_serializer('ConnexionEtape2', {
            'username': serializers.CharField(),
            'code': serializers.CharField(help_text="Code à 6 chiffres reçu par e-mail"),
        }),
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        username = request.data.get('username', '').strip()
        code = request.data.get('code', '').strip()

        if not username or not code:
            return Response(
                {'detail': 'Nom d\'utilisateur et code OTP requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Même réponse que le compte existe ou non : pas d'énumération des identifiants
        code_incorrect = Response(
            {'detail': 'Code de vérification incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )

        user = Utilisateur.objects.filter(username=username).first()
        if user is None:
            journaliser(Operation.ECHEC_OTP, request=request, details={'compte_existant': False})
            return code_incorrect
        if not user.is_active:
            journaliser(Operation.CONNEXION_COMPTE_DESACTIVE, cible=user, request=request,
                        details={'etape': 'code_verification'})
            return code_incorrect

        with transaction.atomic():
            # Seul le dernier code émis est actif (l'étape 1 invalide les précédents)
            otp_obj = OTPCode.objects.select_for_update().filter(
                utilisateur=user, is_used=False
            ).order_by('-created_at').first()

            if otp_obj is None:
                journaliser(Operation.ECHEC_OTP, cible=user, request=request,
                            details={'motif': 'aucun_code_actif'})
                return code_incorrect

            if not otp_obj.is_valid():
                otp_obj.is_used = True
                otp_obj.save(update_fields=['is_used'])
                journaliser(Operation.OTP_EXPIRE, cible=user, request=request)
                return Response(
                    {'detail': 'Ce code a expiré. Veuillez vous reconnecter pour recevoir un nouveau code.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not secrets.compare_digest(otp_obj.code, code):
                # Limite anti force brute : le code est invalidé après MAX_TENTATIVES erreurs
                otp_obj.tentatives += 1
                otp_obj.is_used = otp_obj.tentatives >= OTPCode.MAX_TENTATIVES
                otp_obj.save(update_fields=['tentatives', 'is_used'])
                if otp_obj.is_used:
                    journaliser(Operation.OTP_BLOQUE, cible=user, request=request,
                                details={'tentatives': otp_obj.tentatives})
                    return Response(
                        {'detail': 'Trop de tentatives erronées. Veuillez vous reconnecter pour recevoir un nouveau code.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                journaliser(Operation.ECHEC_OTP, cible=user, request=request,
                            details={'tentatives': otp_obj.tentatives})
                return code_incorrect

            # Marquer le code comme utilisé
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            journaliser(Operation.CONNEXION_REUSSIE, cible=user, request=request,
                        details={'role': user.role})
            # Date de dernière connexion (affichée à l'administrateur)
            update_last_login(None, user)
            Utilisateur.objects.filter(pk=user.pk).update(derniere_activite=timezone.now())

        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)


class DefinirMotDePasseView(EnFrancais, APIView):
    """
    Définition du mot de passe via le lien personnel envoyé par e-mail
    (création de compte ou réinitialisation par l'administrateur).
    Le jeton est à usage unique : il devient invalide dès que le mot de passe change.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['Authentification'],
        summary="Définition du mot de passe depuis le lien reçu par e-mail",
        request=inline_serializer('DefinitionMotDePasse', {
            'uid': serializers.CharField(),
            'token': serializers.CharField(),
            'mot_de_passe': serializers.CharField(),
            'confirmation': serializers.CharField(),
        }),
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        uid = str(request.data.get('uid', '')).strip()
        jeton = str(request.data.get('token', '')).strip()
        mot_de_passe = request.data.get('mot_de_passe', '')
        confirmation = request.data.get('confirmation', '')

        lien_invalide = Response(
            {'detail': "Ce lien est invalide ou a expiré. Demandez un nouveau lien à l'administrateur."},
            status=status.HTTP_400_BAD_REQUEST
        )
        try:
            user = Utilisateur.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (Utilisateur.DoesNotExist, ValueError, TypeError, OverflowError, DjangoValidationError):
            return lien_invalide
        if not user.is_active or not default_token_generator.check_token(user, jeton):
            return lien_invalide

        # Sans mot de passe : simple vérification du lien (affichage du formulaire)
        if not mot_de_passe:
            return Response({'valide': True, 'username': user.username}, status=status.HTTP_200_OK)

        if mot_de_passe != confirmation:
            return Response({'mot_de_passe': ['Les deux mots de passe ne correspondent pas.']},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(mot_de_passe, user)
        except DjangoValidationError as e:
            return Response({'mot_de_passe': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(mot_de_passe)
        user.save(update_fields=['password'])
        OTPCode.objects.filter(utilisateur=user, is_used=False).update(is_used=True)
        journaliser(Operation.MOT_DE_PASSE_DEFINI, cible=user, request=request)
        return Response({'detail': 'Votre mot de passe a été enregistré. Vous pouvez vous connecter.'},
                        status=status.HTTP_200_OK)


class DeconnexionView(APIView):
    """
    Déconnexion : l'agent passe immédiatement « hors ligne » pour l'administrateur.
    Identifié par son jeton de renouvellement, valable plus longtemps que le jeton
    d'accès : la déconnexion est enregistrée même si ce dernier a expiré.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=['Authentification'],
        summary="Déconnexion (statut « hors ligne » immédiat)",
        request=inline_serializer('Deconnexion', {'refresh': serializers.CharField()}),
        responses={204: None},
    )
    def post(self, request):
        try:
            jeton = RefreshToken(str(request.data.get('refresh', '')))
        except TokenError:
            # Session déjà expirée : rien à enregistrer, le client se déconnecte quand même
            return Response(status=status.HTTP_204_NO_CONTENT)
        user = Utilisateur.objects.filter(pk=jeton.get(jwt_settings.USER_ID_CLAIM)).first()
        if user is not None:
            Utilisateur.objects.filter(pk=user.pk).update(derniere_deconnexion=timezone.now())
            journaliser(Operation.DECONNEXION, cible=user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Inscription par l'agent lui-même ───────────────────────────────────────
# 1. L'agent choisit son identifiant, son mot de passe et son espace ;
# 2. un code est envoyé à l'adresse commune de cet espace : seul un membre de
#    l'équipe peut le lire, ce qui prouve l'appartenance à l'espace ;
# 3. le compte attend ensuite la validation de l'administrateur.

def espaces_inscription():
    """Espaces ouverts à l'inscription : ceux dont l'adresse commune est configurée."""
    from administration.models import AdresseNotificationEquipe
    configures = set(AdresseNotificationEquipe.objects.values_list('role', flat=True))
    return [(code, libelle) for code, libelle in AdresseNotificationEquipe.EQUIPES if code in configures]


class InscriptionSerializer(serializers.Serializer):
    username = serializers.RegexField(r'^[\w.@+-]+$', max_length=150, error_messages={
        'invalid': "Lettres, chiffres et . @ + - _ uniquement, sans espace."})
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)
    confirmation = serializers.CharField(trim_whitespace=False)

    def validate_username(self, value):
        existant = Utilisateur.objects.filter(username__iexact=value).first()
        # Une inscription jamais confirmée ne bloque pas l'identifiant : elle sera remplacée
        if existant is not None and existant.inscription != Utilisateur.Inscription.CODE_A_CONFIRMER:
            raise serializers.ValidationError("Cet identifiant est déjà utilisé.")
        return value

    def validate_first_name(self, value):
        return value.strip()

    def validate_last_name(self, value):
        return value.strip()

    def validate_role(self, value):
        if value not in dict(espaces_inscription()):
            raise serializers.ValidationError(
                "Cet espace n'est pas ouvert à l'inscription : son adresse commune n'est pas encore configurée.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirmation']:
            raise serializers.ValidationError({'confirmation': ['Les deux mots de passe ne correspondent pas.']})
        candidat = Utilisateur(username=attrs['username'], first_name=attrs['first_name'],
                               last_name=attrs['last_name'])
        try:
            validate_password(attrs['password'], candidat)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs


class EspacesInscriptionView(EnFrancais, APIView):
    """Espaces dans lesquels un agent peut s'inscrire (aucune adresse n'est révélée)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=['Inscription'], summary="Espaces ouverts à l'inscription", responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response([{'code': code, 'libelle': libelle} for code, libelle in espaces_inscription()])


class InscriptionView(EnFrancais, APIView):
    """Étape 1 : création du compte (inutilisable) et envoi du code à l'adresse de l'espace."""
    permission_classes = [AllowAny]
    authentication_classes = []
    # Chaque demande envoie un e-mail à la boîte de l'équipe : nombre limité par adresse IP
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'inscription'

    @extend_schema(tags=['Inscription'], summary="Demande d'inscription (envoie un code à l'adresse de l'espace)",
                   request=InscriptionSerializer, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        serializer = InscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        with transaction.atomic():
            Utilisateur.objects.filter(
                username__iexact=donnees['username'], inscription=Utilisateur.Inscription.CODE_A_CONFIRMER
            ).delete()
            user = Utilisateur(
                username=donnees['username'], first_name=donnees['first_name'], last_name=donnees['last_name'],
                role=donnees['role'], is_active=False, inscription=Utilisateur.Inscription.CODE_A_CONFIRMER,
            )
            user.set_password(donnees['password'])
            user.save()
            code = nouveau_code(user)
            journaliser(Operation.INSCRIPTION_DEMANDEE, cible=user, request=request, details={'role': user.role})
        indice = envoyer_code(
            user, code, objet="Code d'inscription - Université de Toliara",
            raison=(f"Une personne demande à créer un compte dans l'espace « {user.get_role_display()} ». "
                    f"Transmettez-lui ce code seulement si elle fait bien partie de votre équipe."),
        )
        reponse = {
            'username': user.username,
            'email_hint': indice,
            'message': f"Un code a été envoyé à l'adresse commune de l'espace ({indice}).",
        }
        if settings.DEBUG:
            reponse['dev_otp_code'] = code
        return Response(reponse, status=status.HTTP_201_CREATED)


class ConfirmationInscriptionView(EnFrancais, APIView):
    """Étape 2 : saisie du code ; le compte passe en attente de validation par l'administrateur."""
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=['Inscription'], summary="Confirmation de l'inscription par le code de l'espace",
        request=inline_serializer('ConfirmationInscription', {
            'username': serializers.CharField(), 'code': serializers.CharField()}),
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        code = str(request.data.get('code', '')).strip()
        code_incorrect = Response({'detail': 'Code de vérification incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user = Utilisateur.objects.filter(
            username=username, inscription=Utilisateur.Inscription.CODE_A_CONFIRMER).first()
        if user is None or not code:
            return code_incorrect
        with transaction.atomic():
            otp = OTPCode.objects.select_for_update().filter(
                utilisateur=user, is_used=False).order_by('-created_at').first()
            if otp is None or not otp.is_valid():
                return Response({'detail': "Ce code a expiré. Recommencez l'inscription pour en recevoir un nouveau."},
                                status=status.HTTP_400_BAD_REQUEST)
            if not secrets.compare_digest(otp.code, code):
                otp.tentatives += 1
                otp.is_used = otp.tentatives >= OTPCode.MAX_TENTATIVES
                otp.save(update_fields=['tentatives', 'is_used'])
                journaliser(Operation.ECHEC_OTP, cible=user, request=request,
                            details={'etape': 'inscription', 'tentatives': otp.tentatives})
                if otp.is_used:
                    return Response({'detail': "Trop de tentatives erronées. Recommencez l'inscription."},
                                    status=status.HTTP_400_BAD_REQUEST)
                return code_incorrect
            otp.is_used = True
            otp.save(update_fields=['is_used'])
            user.inscription = Utilisateur.Inscription.EN_ATTENTE
            user.save(update_fields=['inscription'])
            journaliser(Operation.INSCRIPTION_CONFIRMEE, cible=user, request=request, details={'role': user.role})
        return Response({'detail': "Inscription confirmée. Votre compte sera utilisable dès que "
                                   "l'administrateur l'aura validé."})
