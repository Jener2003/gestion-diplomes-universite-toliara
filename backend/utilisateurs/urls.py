from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, EtudiantViewSet
from .views_auth import (
    ConfirmationInscriptionView, DeconnexionView, DefinirMotDePasseView, EspacesInscriptionView,
    InscriptionView, LoginStep1View, LoginStep2View,
)

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet)
router.register(r'etudiants', EtudiantViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # 2FA Authentication endpoints
    path('auth/login/', LoginStep1View.as_view(), name='auth_login_step1'),
    path('auth/verify-otp/', LoginStep2View.as_view(), name='auth_verify_otp'),
    path('auth/logout/', DeconnexionView.as_view(), name='auth_logout'),
    # Inscription par l'agent (code envoyé à l'adresse commune de l'espace, puis validation admin)
    path('auth/inscription/espaces/', EspacesInscriptionView.as_view(), name='auth_inscription_espaces'),
    path('auth/inscription/', InscriptionView.as_view(), name='auth_inscription'),
    path('auth/inscription/confirmer/', ConfirmationInscriptionView.as_view(), name='auth_inscription_confirmer'),
    # Lien personnel (création de compte / réinitialisation par l'administrateur)
    path('auth/definir-mot-de-passe/', DefinirMotDePasseView.as_view(), name='auth_definir_mot_de_passe'),
]
