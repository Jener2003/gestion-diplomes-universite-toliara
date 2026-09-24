from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, EtudiantViewSet
from .views_auth import LoginStep1View, LoginStep2View

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet)
router.register(r'etudiants', EtudiantViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # 2FA Authentication endpoints
    path('auth/login/', LoginStep1View.as_view(), name='auth_login_step1'),
    path('auth/verify-otp/', LoginStep2View.as_view(), name='auth_verify_otp'),
]
