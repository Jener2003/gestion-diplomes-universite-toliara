from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from utilisateurs.models import Utilisateur
from .models import Diplome
from .serializers import DiplomeSerializer


class DiplomeViewSet(viewsets.ReadOnlyModelViewSet):
    # Registre en lecture seule : un Diplome n'est jamais créé/modifié via l'API,
    # uniquement par le circuit (voir demandes.views.passer_etape aux étapes IMPRIMER/SIGNER).
    queryset = Diplome.objects.all().select_related('demande__etudiant__utilisateur')
    serializer_class = DiplomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == Utilisateur.Role.ETUDIANT:
            queryset = queryset.filter(demande__etudiant__utilisateur=user)
        return queryset
