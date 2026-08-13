from django.db import models
from django.conf import settings
from utilisateurs.models import Etudiant
from django.utils.translation import gettext_lazy as _

class DemandeDiplome(models.Model):
    class Statut(models.TextChoices):
        RECUE = 'RECUE', _('Reçue / En examen')
        VERIFIEE_CHEF = 'VERIFIEE_CHEF', _('Validée par Chef de Service')
        SCOLARITE_PREPAREE = 'SCOLARITE_PREPAREE', _('Préparée par Scolarité')
        IMPRIMEE = 'IMPRIMEE', _('Imprimée')
        SIGNEE = 'SIGNEE', _('Signée par Présidence')
        DISPONIBLE = 'DISPONIBLE', _('Disponible au retrait')
        REFUSEE = 'REFUSEE', _('Refusée')
        # Backwards compatibility
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')

    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='demandes')
    type_diplome = models.CharField(max_length=100, verbose_name=_('Type de diplôme'))
    date_demande = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de demande'))
    bordereau_paiement = models.FileField(upload_to='bordereaux/', blank=True, null=True, verbose_name=_('Bordereau de paiement'))
    statut = models.CharField(max_length=30, choices=Statut.choices, default=Statut.RECUE, verbose_name=_('Statut'))
    commentaire = models.TextField(blank=True, null=True, verbose_name=_('Commentaire'))
    observations = models.TextField(blank=True, null=True, verbose_name=_('Observations / Motifs'))
    date_impression = models.DateTimeField(blank=True, null=True, verbose_name=_('Date d\'impression'))
    date_signature = models.DateTimeField(blank=True, null=True, verbose_name=_('Date de signature'))
    date_disponibilite = models.DateTimeField(blank=True, null=True, verbose_name=_('Date de disponibilité au retrait'))
    agent_responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='demandes_traitees',
        verbose_name=_('Agent responsable')
    )

    def __str__(self):
        return f"Demande #{self.id} - {self.etudiant.matricule} ({self.get_statut_display()})"

class Historique(models.Model):
    demande = models.ForeignKey(DemandeDiplome, on_delete=models.CASCADE, related_name='historique')
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='actions_historique')
    action_realisee = models.CharField(max_length=255, verbose_name=_('Action réalisée'))
    date_action = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de l\'action'))

    def __str__(self):
        return f"Historique #{self.id} sur Demande #{self.demande_id} par {self.utilisateur}"

