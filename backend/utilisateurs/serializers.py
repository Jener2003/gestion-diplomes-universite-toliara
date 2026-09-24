from rest_framework import serializers
from .models import Utilisateur, Etudiant

class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'etablissement')
        read_only_fields = ('role',)

class EtudiantSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurSerializer(read_only=True)
    
    class Meta:
        model = Etudiant
        fields = '__all__'
