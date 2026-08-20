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
    # None tant que le diplôme n'a pas encore été imprimé (voir passer_etape IMPRIMER)
    diplome = DiplomeSerializer(read_only=True)

    class Meta:
        model = DemandeDiplome
        fields = '__all__'
