from django.contrib import admin

from .models import JournalActivite


@admin.register(JournalActivite)
class JournalActiviteAdmin(admin.ModelAdmin):
    """Consultation seule : le journal ne se modifie pas, même par un superutilisateur."""
    list_display = ('date', 'categorie', 'operation', 'auteur_username', 'cible_username', 'adresse_ip')
    list_filter = ('categorie', 'operation')
    search_fields = ('auteur_username', 'cible_username')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
