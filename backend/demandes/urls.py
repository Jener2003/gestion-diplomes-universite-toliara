from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DemandeDiplomeViewSet, HistoriqueViewSet

router = DefaultRouter()
router.register(r'demandes', DemandeDiplomeViewSet)
router.register(r'historiques', HistoriqueViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
