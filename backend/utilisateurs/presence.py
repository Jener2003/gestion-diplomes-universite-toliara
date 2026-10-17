"""
Statut de présence des agents (en ligne / absent / hors ligne).

L'activité est la date de la dernière requête faite par l'agent lui-même. Les
requêtes automatiques du frontend (rafraîchissement périodique des notifications,
des listes) portent l'en-tête X-Requete-Auto et ne comptent pas : un onglet
oublié ouvert ne garde donc pas un agent « en ligne ».
"""
from datetime import timedelta

from django.db.models import F, Q
from django.utils import timezone

DELAI_EN_LIGNE = timedelta(minutes=5)
DELAI_ABSENT = timedelta(minutes=30)
# Au plus une écriture en base par agent et par minute
INTERVALLE_ENREGISTREMENT = timedelta(seconds=60)

EN_TETE_REQUETE_AUTO = 'X-Requete-Auto'

EN_LIGNE = 'en_ligne'
ABSENT = 'absent'
HORS_LIGNE = 'hors_ligne'


def est_requete_automatique(request):
    return request.headers.get(EN_TETE_REQUETE_AUTO) == '1'


def enregistrer_activite(user, maintenant=None):
    maintenant = maintenant or timezone.now()
    deconnecte = user.derniere_deconnexion and user.derniere_activite and user.derniere_deconnexion >= user.derniere_activite
    if (user.derniere_activite and not deconnecte
            and maintenant - user.derniere_activite < INTERVALLE_ENREGISTREMENT):
        return
    # update() : pas de save() complet, aucun risque d'écraser une modification concurrente
    type(user).objects.filter(pk=user.pk).update(derniere_activite=maintenant)
    user.derniere_activite = maintenant


def statut_presence(user, maintenant=None):
    activite = user.derniere_activite
    if not user.is_active or activite is None:
        return HORS_LIGNE
    if user.derniere_deconnexion and user.derniere_deconnexion >= activite:
        return HORS_LIGNE
    ecart = (maintenant or timezone.now()) - activite
    if ecart < DELAI_EN_LIGNE:
        return EN_LIGNE
    if ecart < DELAI_ABSENT:
        return ABSENT
    return HORS_LIGNE


def filtre_en_ligne(maintenant=None):
    """Q équivalent à statut_presence(...) == EN_LIGNE, pour compter en base."""
    seuil = (maintenant or timezone.now()) - DELAI_EN_LIGNE
    return (Q(is_active=True, derniere_activite__gt=seuil)
            & (Q(derniere_deconnexion__isnull=True) | Q(derniere_deconnexion__lt=F('derniere_activite'))))
