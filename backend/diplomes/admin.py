from django.contrib import admin
from .models import Diplome


@admin.register(Diplome)
class DiplomeAdmin(admin.ModelAdmin):
    list_display = ('numero_diplome', 'code_verification', 'demande', 'mention', 'date_delivrance')
    search_fields = ('numero_diplome', 'code_verification', 'demande__etudiant__matricule', 'demande__etudiant__nom')
    list_filter = ('mention',)
