from rest_framework import serializers
from .models import DemandeDiplome, Historique
from utilisateurs.serializers import EtudiantSerializer

class HistoriqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Historique
        fields = '__all__'

class DemandeDiplomeSerializer(serializers.ModelSerializer):
    historique = HistoriqueSerializer(many=True, read_only=True)
    etudiant_details = EtudiantSerializer(source='etudiant', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    
    class Meta:
        model = DemandeDiplome
        fields = '__all__'
