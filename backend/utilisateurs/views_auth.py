from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Utilisateur, OTPCode


class LoginStep1View(APIView):
    """
    Étape 1 de la 2FA : vérifie username/password, génère un OTP et l'envoie par email.
    """
    permission_classes = [AllowAny]

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
            return Response(
                {'detail': 'Identifiants incorrects.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
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

    def post(self, request):
        username = request.data.get('username', '').strip()
        code = request.data.get('code', '').strip()

        if not username or not code:
            return Response(
                {'detail': 'Nom d\'utilisateur et code OTP requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = Utilisateur.objects.get(username=username)
        except Utilisateur.DoesNotExist:
            return Response(
                {'detail': 'Utilisateur introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Chercher un OTP valide (non utilisé, le plus récent)
        otp_obj = OTPCode.objects.filter(
            utilisateur=user, code=code, is_used=False
        ).order_by('-created_at').first()

        if otp_obj is None:
            return Response(
                {'detail': 'Code de vérification incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not otp_obj.is_valid():
            return Response(
                {'detail': 'Ce code a expiré. Veuillez vous reconnecter pour recevoir un nouveau code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Marquer le code comme utilisé
        otp_obj.is_used = True
        otp_obj.save()

        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)
