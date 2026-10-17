from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from utilisateurs.models import Utilisateur


class JournalActivite(models.Model):
    """
    Journal des opérations d'administration et des événements de sécurité.
    Les actions sur les demandes restent tracées dans demandes.Historique.
    Une entrée n'est jamais modifiée ni supprimée, et ne contient aucun secret
    (mot de passe, code OTP, jeton).
    """

    class Categorie(models.TextChoices):
        ADMINISTRATION = 'ADMINISTRATION', _('Administration')
        SECURITE = 'SECURITE', _('Sécurité')
        TECHNIQUE = 'TECHNIQUE', _('Technique')

    class Operation(models.TextChoices):
        # Administration des comptes
        COMPTE_CREE = 'COMPTE_CREE', _('Création de compte')
        COMPTE_MODIFIE = 'COMPTE_MODIFIE', _('Modification de compte')
        ROLE_MODIFIE = 'ROLE_MODIFIE', _('Modification de rôle')
        COMPTE_ACTIVE = 'COMPTE_ACTIVE', _('Activation de compte')
        COMPTE_DESACTIVE = 'COMPTE_DESACTIVE', _('Désactivation de compte')
        REINITIALISATION_DEMANDEE = 'REINITIALISATION_DEMANDEE', _('Réinitialisation d\'accès demandée')
        ADRESSE_EQUIPE_MODIFIEE = 'ADRESSE_EQUIPE_MODIFIEE', _('Modification d\'une adresse de notification d\'équipe')
        # Technique
        NOTIFICATION_EMAIL_ECHEC = 'NOTIFICATION_EMAIL_ECHEC', _('Échec d\'envoi d\'une notification par e-mail')
        # Sécurité
        CONNEXION_REUSSIE = 'CONNEXION_REUSSIE', _('Connexion réussie')
        ECHEC_MOT_DE_PASSE = 'ECHEC_MOT_DE_PASSE', _('Échec de connexion (identifiants)')
        CONNEXION_COMPTE_DESACTIVE = 'CONNEXION_COMPTE_DESACTIVE', _('Tentative sur un compte désactivé')
        ECHEC_OTP = 'ECHEC_OTP', _('Code de vérification refusé')
        OTP_EXPIRE = 'OTP_EXPIRE', _('Code de vérification expiré')
        OTP_BLOQUE = 'OTP_BLOQUE', _('Code bloqué après trop de tentatives')
        MOT_DE_PASSE_DEFINI = 'MOT_DE_PASSE_DEFINI', _('Mot de passe défini via le lien sécurisé')

    OPERATIONS_ADMINISTRATION = frozenset({
        Operation.COMPTE_CREE,
        Operation.COMPTE_MODIFIE,
        Operation.ROLE_MODIFIE,
        Operation.COMPTE_ACTIVE,
        Operation.COMPTE_DESACTIVE,
        Operation.REINITIALISATION_DEMANDEE,
        Operation.ADRESSE_EQUIPE_MODIFIEE,
    })
    OPERATIONS_TECHNIQUES = frozenset({
        Operation.NOTIFICATION_EMAIL_ECHEC,
    })

    categorie = models.CharField(max_length=20, choices=Categorie.choices, db_index=True, verbose_name=_('Catégorie'))
    operation = models.CharField(max_length=40, choices=Operation.choices, db_index=True, verbose_name=_('Opération'))
    # Lien + copie du nom : l'entrée reste lisible même si le compte change ou disparaît
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='journal_actions', verbose_name=_('Auteur')
    )
    auteur_username = models.CharField(max_length=150, blank=True, verbose_name=_('Identifiant de l\'auteur'))
    cible = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='journal_concernant', verbose_name=_('Compte concerné')
    )
    cible_username = models.CharField(max_length=150, blank=True, verbose_name=_('Identifiant du compte concerné'))
    adresse_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name=_('Adresse IP'))
    details = models.JSONField(default=dict, blank=True, verbose_name=_('Détails'))
    date = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name=_('Date'))

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = _('Entrée du journal d\'activité')
        verbose_name_plural = _('Journal d\'activité')

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Une entrée du journal d'activité ne peut pas être modifiée.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Une entrée du journal d'activité ne peut pas être supprimée.")

    def __str__(self):
        return f"{self.date:%Y-%m-%d %H:%M} {self.operation} ({self.auteur_username or '-'} → {self.cible_username or '-'})"


class AdresseNotificationEquipe(models.Model):
    """
    Adresse électronique fonctionnelle d'une équipe métier (boîte partagée).
    Elle reçoit une copie des notifications adressées à toute l'équipe ; elle ne
    sert jamais d'identifiant de connexion (les comptes restent personnels).
    """
    # Les cinq équipes métier de l'application (rôles attribuables hors administrateur)
    EQUIPES = tuple(
        (role.value, role.label) for role in Utilisateur.ROLES_ATTRIBUABLES
        if role != Utilisateur.Role.ADMIN_SYSTEME
    )

    role = models.CharField(max_length=50, choices=EQUIPES, unique=True, verbose_name=_('Équipe'))
    email = models.EmailField(verbose_name=_('Adresse de notification'))
    actif = models.BooleanField(default=True, verbose_name=_('Envoi activé'))
    modifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('Modifié par')
    )
    date_modification = models.DateTimeField(auto_now=True, verbose_name=_('Dernière modification'))

    class Meta:
        ordering = ['role']
        verbose_name = _('Adresse de notification d\'équipe')
        verbose_name_plural = _('Adresses de notification des équipes')

    def __str__(self):
        return f"{self.get_role_display()} : {self.email}{'' if self.actif else ' (désactivée)'}"
