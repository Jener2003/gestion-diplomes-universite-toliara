import secrets

from django.db import models
from django.utils.translation import gettext_lazy as _

from demandes.models import DemandeDiplome


class Diplome(models.Model):
    """
    Registre officiel du diplôme délivré, lié 1-1 à la demande qui l'a produit.
    Le numéro/code sont réservés à l'impression (voir passer_etape 'IMPRIMER') ;
    date_delivrance n'est renseignée qu'à la signature de la Présidence.
    """
    demande = models.OneToOneField(DemandeDiplome, on_delete=models.CASCADE, related_name='diplome')
    numero_diplome = models.CharField(max_length=50, unique=True, verbose_name=_('Numéro de diplôme'))
    code_verification = models.CharField(max_length=20, unique=True, verbose_name=_('Code de vérification'))
    mention = models.CharField(max_length=50, blank=True, verbose_name=_('Mention'))
    date_delivrance = models.DateField(null=True, blank=True, verbose_name=_('Date de délivrance'))
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création du registre"))

    class Meta:
        ordering = ['-date_creation']
        verbose_name = _('Diplôme')
        verbose_name_plural = _('Diplômes')

    def __str__(self):
        return f"{self.numero_diplome} ({self.demande.etudiant.matricule})"

    @staticmethod
    def generer_numero(annee):
        # Basé sur le plus grand numéro existant (et non le nombre de lignes),
        # pour ne jamais réattribuer un numéro après une suppression.
        prefixe = f"UT-{annee}-"
        numeros = Diplome.objects.select_for_update().filter(
            numero_diplome__startswith=prefixe
        ).values_list('numero_diplome', flat=True)
        dernier = max((int(n[len(prefixe):]) for n in numeros if n[len(prefixe):].isdigit()), default=0)
        return f"{prefixe}{dernier + 1:05d}"

    @staticmethod
    def generer_code_verification():
        while True:
            code = secrets.token_hex(4).upper()
            if not Diplome.objects.filter(code_verification=code).exists():
                return code
