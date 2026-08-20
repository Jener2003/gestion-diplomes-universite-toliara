from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class Utilisateur(AbstractUser):
    class Role(models.TextChoices):
        ETUDIANT = 'ETUDIANT', _('Étudiant')
        CHEF_SERVICE = 'CHEF_SERVICE', _('Chef de Service')
        SCOLARITE_CENTRALE = 'SCOLARITE_CENTRALE', _('Scolarité Centrale')
        IMPRIMEUR = 'IMPRIMEUR', _('Imprimeur')
        PRESIDENCE = 'PRESIDENCE', _('Présidence')

    role = models.CharField(
        max_length=50,
        choices=Role.choices,
        default=Role.ETUDIANT,
        verbose_name=_('Rôle')
    )

    @property
    def is_staff_role(self):
        """True for any administrative circuit role (not a student)."""
        return self.role != self.Role.ETUDIANT

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"

class Etudiant(models.Model):
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, related_name='etudiant_profile')
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

