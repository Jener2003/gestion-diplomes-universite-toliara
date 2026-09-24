from django.db import models
from django.conf import settings
from utilisateurs.models import Etudiant
from django.utils.translation import gettext_lazy as _

class DemandeDiplome(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE_VERIFICATION = 'EN_ATTENTE_VERIFICATION', _('En attente de vérification')
        DOSSIER_INCOMPLET = 'DOSSIER_INCOMPLET', _('Dossier incomplet')
        REFUSEE = 'REFUSEE', _('Refusée')
        VALIDEE = 'VALIDEE', _('Validée par Scolarité Centrale')
        EN_TRAITEMENT = 'EN_TRAITEMENT', _('En traitement (Chef de Service)')
        EN_ATTENTE_IMPRESSION = 'EN_ATTENTE_IMPRESSION', _('Affectée à l\'imprimeur')
        EN_IMPRESSION = 'EN_IMPRESSION', _('En cours d\'impression')
        IMPRIME = 'IMPRIME', _('Imprimé')
        EN_ATTENTE_SIGNATURE_ETABLISSEMENT = 'EN_ATTENTE_SIGNATURE_ETABLISSEMENT', _('En attente signature Doyen/Directeur')
        SIGNE_ETABLISSEMENT = 'SIGNE_ETABLISSEMENT', _('Signé par l\'établissement')
        EN_TRANSMISSION_PRESIDENT = 'EN_TRANSMISSION_PRESIDENT', _('En transmission vers la Présidence')
        EN_ATTENTE_SIGNATURE_PRESIDENT = 'EN_ATTENTE_SIGNATURE_PRESIDENT', _('En attente signature Président')
        SIGNE_PRESIDENT = 'SIGNE_PRESIDENT', _('Signé par le Président')
        RETOUR_SCOLARITE = 'RETOUR_SCOLARITE', _('En retour vers la scolarité')
        DISPONIBLE = 'DISPONIBLE', _('Disponible au retrait')
        RETIRE = 'RETIRE', _('Diplôme retiré')

    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='demandes')
    type_diplome = models.CharField(max_length=100, verbose_name=_('Type de diplôme'))
    date_demande = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de demande'))
    statut = models.CharField(max_length=45, choices=Statut.choices, default=Statut.EN_ATTENTE_VERIFICATION, verbose_name=_('Statut'))
    
    # Pièces constitutives du dossier
    recu_bancaire = models.FileField(upload_to='bordereaux/', blank=True, null=True, verbose_name=_('Reçu bancaire / Bordereau'))
    pv_soutenance_file = models.FileField(upload_to='pv_soutenance/', blank=True, null=True, verbose_name=_('PV de soutenance'))
    releve_notes_file = models.FileField(upload_to='releves/', blank=True, null=True, verbose_name=_('Relevé de notes'))
    certificat_scolarite_file = models.FileField(upload_to='certificats/', blank=True, null=True, verbose_name=_('Certificat de scolarité'))

    # Indicateurs de conformité des pièces
    has_pv_soutenance = models.BooleanField(default=True, verbose_name=_('PV de soutenance fourni'))
    has_releve_notes = models.BooleanField(default=True, verbose_name=_('Relevé de notes fourni'))
    has_certificat_scolarite = models.BooleanField(default=True, verbose_name=_('Certificat de scolarité fourni'))
    has_recu_bancaire = models.BooleanField(default=True, verbose_name=_('Reçu bancaire fourni'))

    # Commentaires et motifs
    commentaire = models.TextField(blank=True, null=True, verbose_name=_('Commentaire'))
    observations = models.TextField(blank=True, null=True, verbose_name=_('Observations / Motifs'))

    # Acteurs et assignations
    etablissement_origine = models.CharField(max_length=150, blank=True, null=True, verbose_name=_('Établissement d\'origine'))
    agent_responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='demandes_traitees',
        verbose_name=_('Dernier agent responsable')
    )
    imprimeur_assigne = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes_impression',
        verbose_name=_('Imprimeur assigné')
    )
    agent_transmission = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes_transmission',
        verbose_name=_('Agent de transmission')
    )

    # Dates de jalon du circuit
    date_impression = models.DateTimeField(blank=True, null=True, verbose_name=_('Date d\'impression'))
    date_signature_etablissement = models.DateTimeField(blank=True, null=True, verbose_name=_('Date signature Doyen/Directeur'))
    date_transmission_president = models.DateTimeField(blank=True, null=True, verbose_name=_('Date transmission Présidence'))
    date_signature_president = models.DateTimeField(blank=True, null=True, verbose_name=_('Date signature Président'))
    date_disponibilite = models.DateTimeField(blank=True, null=True, verbose_name=_('Date de disponibilité au retrait'))
    date_retrait = models.DateTimeField(blank=True, null=True, verbose_name=_('Date effective de retrait'))
    nom_retirant = models.CharField(max_length=150, blank=True, null=True, verbose_name=_('Retiré par'))

    def __str__(self):
        return f"Demande #{self.id} - {self.etudiant.matricule} ({self.get_statut_display()})"

class Historique(models.Model):
    demande = models.ForeignKey(DemandeDiplome, on_delete=models.CASCADE, related_name='historique')
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='actions_historique')
    role_utilisateur = models.CharField(max_length=50, blank=True, verbose_name=_('Rôle au moment de l\'action'))
    action_realisee = models.CharField(max_length=255, verbose_name=_('Action réalisée'))
    ancien_statut = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('Ancien statut'))
    nouveau_statut = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('Nouveau statut'))
    commentaire = models.TextField(blank=True, null=True, verbose_name=_('Commentaire / Motif'))
    date_action = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de l\'action'))

    class Meta:
        ordering = ['-date_action']

    def __str__(self):
        return f"Historique #{self.id} - Demande #{self.demande_id} ({self.action_realisee}) par {self.utilisateur}"

