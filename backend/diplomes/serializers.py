from rest_framework import serializers
from .models import Diplome


class DiplomeSerializer(serializers.ModelSerializer):
    matricule = serializers.CharField(source='demande.etudiant.matricule', read_only=True)
    nom = serializers.CharField(source='demande.etudiant.nom', read_only=True)
    prenom = serializers.CharField(source='demande.etudiant.prenom', read_only=True)
    faculte = serializers.CharField(source='demande.etudiant.faculte', read_only=True)
    filiere = serializers.CharField(source='demande.etudiant.filiere', read_only=True)
    type_diplome = serializers.CharField(source='demande.type_diplome', read_only=True)

    class Meta:
        model = Diplome
        fields = (
            'id', 'demande', 'numero_diplome', 'code_verification', 'mention',
            'date_delivrance', 'date_creation',
            'matricule', 'nom', 'prenom', 'faculte', 'filiere', 'type_diplome',
        )
