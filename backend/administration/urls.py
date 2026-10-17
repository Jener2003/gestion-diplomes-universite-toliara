from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EquipeNotificationDetailView, EquipeNotificationTestView, EquipesNotificationView,
    JournalActiviteViewSet, RolesAdminView, SecuriteAdminView,
    StatistiquesAdminView, UtilisateurAdminViewSet,
)

router = DefaultRouter()
router.register(r'journal', JournalActiviteViewSet, basename='journal')
router.register(r'utilisateurs', UtilisateurAdminViewSet, basename='admin-utilisateur')

urlpatterns = [
    path('stats/', StatistiquesAdminView.as_view(), name='admin-stats'),
    path('roles/', RolesAdminView.as_view(), name='admin-roles'),
    path('securite/', SecuriteAdminView.as_view(), name='admin-securite'),
    path('equipes/', EquipesNotificationView.as_view(), name='admin-equipes'),
    path('equipes/<str:role>/', EquipeNotificationDetailView.as_view(), name='admin-equipe'),
    path('equipes/<str:role>/tester/', EquipeNotificationTestView.as_view(), name='admin-equipe-tester'),
    path('', include(router.urls)),
]
