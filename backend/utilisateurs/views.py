from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Utilisateur, Etudiant
from .serializers import UtilisateurSerializer, EtudiantSerializer

class UtilisateurViewSet(viewsets.GenericViewSet):
    # Aucune route CRUD générique : IsAdminUser ne testait que is_staff, que tous
    # les agents possèdent (creer_agent). La gestion des comptes relève de
    # l'espace Administrateur, avec sa propre permission.
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def imprimeurs(self, request):
        """Liste des utilisateurs avec le rôle IMPRIMEUR pour assignation."""
        imprimeurs = Utilisateur.objects.filter(role=Utilisateur.Role.IMPRIMEUR, is_active=True)
        serializer = self.get_serializer(imprimeurs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def agents_transmission(self, request):
        """Liste des utilisateurs avec le rôle AGENT_TRANSMISSION pour assignation."""
        agents = Utilisateur.objects.filter(role=Utilisateur.Role.AGENT_TRANSMISSION, is_active=True)
        serializer = self.get_serializer(agents, many=True)
        return Response(serializer.data)

class EtudiantViewSet(viewsets.ReadOnlyModelViewSet):
    # Lecture seule : les fiches étudiants sont créées via le dépôt d'une demande.
    # Une suppression effacerait en cascade toutes les demandes de l'étudiant.
    queryset = Etudiant.objects.all()
    serializer_class = EtudiantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Refus par défaut : administrateur, rôle inconnu ou obsolète
        if user.role not in Utilisateur.ROLES_METIER:
            return Etudiant.objects.none()
        if user.role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT and user.etablissement:
            return Etudiant.objects.filter(faculte__icontains=user.etablissement)
        return Etudiant.objects.all()
