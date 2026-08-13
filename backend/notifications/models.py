from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Notification(models.Model):
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications', verbose_name=_('Utilisateur destinataire'))
    titre = models.CharField(max_length=255, verbose_name=_('Titre'), default="Notification")
    message = models.TextField(verbose_name=_('Message'))
    type_notification = models.CharField(max_length=50, default='INFO', verbose_name=_('Type'))
    lu = models.BooleanField(default=False, verbose_name=_('Lu'))
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de création'))

    def __str__(self):
        return f"Notification à {self.utilisateur} - {'Lue' if self.lu else 'Non lue'}"

