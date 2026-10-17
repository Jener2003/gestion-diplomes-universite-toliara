from rest_framework.permissions import BasePermission

from .models import Utilisateur


class EstAdministrateurSysteme(BasePermission):
    """
    Réservé aux comptes actifs ayant explicitement le rôle ADMIN_SYSTEME.
    Ne s'appuie pas sur is_staff / is_superuser : creer_agent met is_staff
    à tous les agents, et des comptes métier peuvent être superutilisateurs.
    """
    message = "Accès réservé à l'administrateur système."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active
            and user.role == Utilisateur.Role.ADMIN_SYSTEME
        )
