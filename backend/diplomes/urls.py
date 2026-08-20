from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiplomeViewSet

router = DefaultRouter()
router.register(r'diplomes', DiplomeViewSet, basename='diplome')

urlpatterns = [
    path('', include(router.urls)),
]
