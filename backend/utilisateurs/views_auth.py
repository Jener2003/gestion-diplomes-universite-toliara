import secrets

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.db import transaction
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from administration.models import JournalActivite
from administration.services import journaliser
from .langue import EnFrancais
from .models import Utilisateur, OTPCode

Operation = JournalActivite.Operation


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

        # Invalider tous les anciens codes OTP non utilisés pour cet utilisateur
        OTPCode.objects.filter(utilisateur=user, is_used=False).update(is_used=True)

        # Générer un nouveau code OTP
        code = OTPCode.generate_code()
        OTPCode.objects.create(utilisateur=user, code=code)

        # Préparer l'email
        user_email = user.email or ''
        sujet = 'Code de vérification - Université de Toliara'
        message = (
            f"Bonjour {user.first_name or user.username},\n\n"
            f"Votre code de vérification pour accéder au système de gestion des diplômes est :\n\n"
            f"    {code}\n\n"
            f"Ce code est valable pendant {OTPCode.OTP_VALIDITY_MINUTES} minutes.\n"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n"
            f"Université de Toliara — Système de Gestion des Diplômes"
        )

        if user_email:
            send_mail(
                sujet,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user_email],
                fail_silently=False,
            )
            # Masquer partiellement l'email pour la réponse
            parts = user_email.split('@')
            masked = parts[0][:2] + '***@' + parts[1] if len(parts) == 2 else '***'
        else:
            # Pas d'email configuré : afficher dans la console (mode dev)
            print(f"\n{'='*50}")
            print(f"[2FA] Code OTP pour {user.username}: {code}")
            print(f"{'='*50}\n")
            masked = '(console — aucun email configuré)'

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
