from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Utilisateur, Etudiant
from .serializers import UtilisateurSerializer, EtudiantSerializer

class UtilisateurViewSet(viewsets.ModelViewSet):
    # Gestion des comptes utilisateurs réservée aux administrateurs Django (is_staff/superuser) :
    # aucun rôle du circuit (Chef de Service, Scolarité, etc.) n'en a besoin via l'API,
    # cela évite qu'un compte authentifié quelconque puisse lister/modifier d'autres comptes.
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAdminUser]

    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class EtudiantViewSet(viewsets.ModelViewSet):
    queryset = Etudiant.objects.all()
    serializer_class = EtudiantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == Utilisateur.Role.ETUDIANT:
            return Etudiant.objects.filter(utilisateur=user)
        return Etudiant.objects.all()
