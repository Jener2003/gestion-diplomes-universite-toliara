from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from utilisateurs.models import Utilisateur
from .models import Diplome
from .serializers import DiplomeSerializer


class DiplomeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Diplome.objects.all().select_related('demande__etudiant')
    serializer_class = DiplomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT and user.etablissement:
            queryset = queryset.filter(demande__etudiant__faculte__icontains=user.etablissement)
        return queryset
