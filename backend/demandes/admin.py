from django.contrib import admin
from .models import DemandeDiplome, Historique


class HistoriqueInline(admin.TabularInline):
    model = Historique
    extra = 0
    readonly_fields = ('utilisateur', 'action_realisee', 'date_action')
    can_delete = False


@admin.register(DemandeDiplome)
class DemandeDiplomeAdmin(admin.ModelAdmin):
    list_display = ('id', 'etudiant', 'type_diplome', 'statut', 'date_demande', 'agent_responsable')
    list_filter = ('statut', 'type_diplome')
    search_fields = ('etudiant__matricule', 'etudiant__nom', 'etudiant__prenom')
    inlines = [HistoriqueInline]


@admin.register(Historique)
class HistoriqueAdmin(admin.ModelAdmin):
    list_display = ('id', 'demande', 'utilisateur', 'action_realisee', 'date_action')
    list_filter = ('date_action',)
