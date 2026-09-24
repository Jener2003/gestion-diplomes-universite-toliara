from rest_framework import serializers
from .models import DemandeDiplome, Historique
from utilisateurs.serializers import EtudiantSerializer, UtilisateurSerializer
from diplomes.serializers import DiplomeSerializer

class HistoriqueSerializer(serializers.ModelSerializer):
    utilisateur_details = UtilisateurSerializer(source='utilisateur', read_only=True)

    class Meta:
        model = Historique
        fields = '__all__'

class DemandeDiplomeSerializer(serializers.ModelSerializer):
    historique = HistoriqueSerializer(many=True, read_only=True)
    etudiant_details = EtudiantSerializer(source='etudiant', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    imprimeur_details = UtilisateurSerializer(source='imprimeur_assigne', read_only=True)
    agent_transmission_details = UtilisateurSerializer(source='agent_transmission', read_only=True)
    agent_responsable_details = UtilisateurSerializer(source='agent_responsable', read_only=True)
    diplome = DiplomeSerializer(read_only=True)

    class Meta:
        model = DemandeDiplome
        fields = '__all__'
