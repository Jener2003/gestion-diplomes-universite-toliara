from django.utils import translation


class EnFrancais:
    """
    Messages du serveur en français pour la vue (validateurs de mot de passe,
    erreurs de champs DRF), sans modifier LANGUAGE_CODE pour le reste de l'application.
    """

    def dispatch(self, request, *args, **kwargs):
        with translation.override('fr'):
            return super().dispatch(request, *args, **kwargs)
