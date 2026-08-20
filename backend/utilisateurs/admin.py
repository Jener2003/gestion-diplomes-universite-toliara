from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur, Etudiant


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Rôle', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Rôle', {'fields': ('role',)}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = UserAdmin.list_filter + ('role',)


@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'nom', 'prenom', 'faculte', 'filiere', 'niveau_etude')
    search_fields = ('matricule', 'nom', 'prenom', 'cin')
    list_filter = ('faculte', 'filiere', 'niveau_etude')
