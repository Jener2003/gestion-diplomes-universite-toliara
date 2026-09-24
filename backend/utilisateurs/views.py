from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Utilisateur, Etudiant
from .serializers import UtilisateurSerializer, EtudiantSerializer

class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAdminUser]

    def get_permissions(self):
        if self.action in ['me', 'imprimeurs', 'agents_transmission']:
            return [IsAuthenticated()]
        return super().get_permissions()

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

class EtudiantViewSet(viewsets.ModelViewSet):
    queryset = Etudiant.objects.all()
    serializer_class = EtudiantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT and user.etablissement:
            return Etudiant.objects.filter(faculte=user.etablissement)
        return Etudiant.objects.all()
