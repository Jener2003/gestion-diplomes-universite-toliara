from rest_framework_simplejwt.authentication import JWTAuthentication

from .presence import enregistrer_activite, est_requete_automatique


class JWTAuthentificationAvecActivite(JWTAuthentication):
    """Authentification JWT qui note l'activité de l'agent (statut de présence)."""

    def authenticate(self, request):
        resultat = super().authenticate(request)
        if resultat is not None and not est_requete_automatique(request):
            enregistrer_activite(resultat[0])
        return resultat


try:
    from drf_spectacular.contrib.rest_framework_simplejwt import SimpleJWTScheme
except ImportError:  # documentation Swagger non installée
    SimpleJWTScheme = None

if SimpleJWTScheme is not None:
    class JWTAvecActiviteScheme(SimpleJWTScheme):
        """Swagger : même schéma Bearer que l'authentification JWT standard."""
        target_class = 'utilisateurs.authentication.JWTAuthentificationAvecActivite'
