from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import random
import string

class Utilisateur(AbstractUser):
    class Role(models.TextChoices):
        SCOLARITE_ETABLISSEMENT = 'SCOLARITE_ETABLISSEMENT', _('Scolarité Établissement')
        SCOLARITE_CENTRALE = 'SCOLARITE_CENTRALE', _('Scolarité Centrale')
        CHEF_SERVICE = 'CHEF_SERVICE', _('Chef de Service des Diplômes')
        IMPRIMEUR = 'IMPRIMEUR', _('Concepteur / Imprimeur')
        AGENT_TRANSMISSION = 'AGENT_TRANSMISSION', _('Agent de Transmission')
        PRESIDENCE = 'PRESIDENCE', _('Président de l\'Université')

    role = models.CharField(
        max_length=50,
        choices=Role.choices,
        default=Role.SCOLARITE_ETABLISSEMENT,
        verbose_name=_('Rôle')
    )
    etablissement = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name=_('Établissement / Faculté rattaché')
    )

    @property
    def is_staff_role(self):
        """True for any administrative circuit role."""
        return True

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"

class Etudiant(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='etudiant_profile'
    )
    matricule = models.CharField(max_length=50, unique=True, verbose_name=_('Matricule'))
    nom = models.CharField(max_length=100, verbose_name=_('Nom'))
    prenom = models.CharField(max_length=100, verbose_name=_('Prénom'))
    date_naissance = models.DateField(verbose_name=_('Date de naissance'))
    cin = models.CharField(max_length=20, unique=True, verbose_name=_('CIN'))
    faculte = models.CharField(max_length=100, verbose_name=_('Faculté'))
    filiere = models.CharField(max_length=100, verbose_name=_('Filière'))
    niveau_etude = models.CharField(max_length=50, verbose_name=_('Niveau d\'étude'))
    photo = models.ImageField(upload_to='photos_etudiants/', blank=True, null=True, verbose_name=_('Photo'))

    def __str__(self):
        return f"{self.matricule} - {self.nom} {self.prenom}"


class OTPCode(models.Model):
    """Stores a temporary 6-digit OTP code for email-based 2FA."""
    OTP_VALIDITY_MINUTES = 10

    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, related_name='otp_codes'
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    @staticmethod
    def generate_code():
        """Generate a secure 6-digit numeric OTP."""
        return ''.join(random.choices(string.digits, k=6))

    def is_valid(self):
        """True if the OTP is not used and not expired (within OTP_VALIDITY_MINUTES)."""
        expiry = self.created_at + timezone.timedelta(minutes=self.OTP_VALIDITY_MINUTES)
        return not self.is_used and timezone.now() < expiry

    def __str__(self):
        return f"OTP({self.utilisateur.username}) - {'utilisé' if self.is_used else 'actif'}"
