from rest_framework import serializers
from .models import DemandeDiplome, Historique
from utilisateurs.serializers import EtudiantSerializer, UtilisateurSerializer
from diplomes.serializers import DiplomeSerializer

STATUTS_HORS_PERIMETRE = {
    'EN_ATTENTE_SIGNATURE_ETABLISSEMENT': DemandeDiplome.Statut.IMPRIME,
    'SIGNE_ETABLISSEMENT': DemandeDiplome.Statut.IMPRIME,
    'DISPONIBLE': DemandeDiplome.Statut.RETOUR_SCOLARITE,
    'RETIRE': DemandeDiplome.Statut.RETOUR_SCOLARITE,
}

class HistoriqueSerializer(serializers.ModelSerializer):
    utilisateur_details = UtilisateurSerializer(source='utilisateur', read_only=True)

    class Meta:
        model = Historique
        fields = '__all__'

class DemandeDiplomeSerializer(serializers.ModelSerializer):
    historique = HistoriqueSerializer(many=True, read_only=True)
    etudiant_details = EtudiantSerializer(source='etudiant', read_only=True)
    statut = serializers.SerializerMethodField()
    statut_display = serializers.SerializerMethodField()
    imprimeur_details = UtilisateurSerializer(source='imprimeur_assigne', read_only=True)
    agent_transmission_details = UtilisateurSerializer(source='agent_transmission', read_only=True)
    agent_responsable_details = UtilisateurSerializer(source='agent_responsable', read_only=True)
    diplome = DiplomeSerializer(read_only=True)

    class Meta:
        model = DemandeDiplome
        fields = '__all__'
        read_only_fields = ('date_transmission_chef',)

    def get_statut_display(self, demande) -> str:
        statut = STATUTS_HORS_PERIMETRE.get(demande.statut, demande.statut)
        if statut == DemandeDiplome.Statut.RETOUR_SCOLARITE:
            return 'En retour vers le Chef de service'
        return dict(DemandeDiplome.Statut.choices).get(statut, statut)

    def get_statut(self, demande) -> str:
        return STATUTS_HORS_PERIMETRE.get(demande.statut, demande.statut)


class DemandeDiplomeListeSerializer(DemandeDiplomeSerializer):
    """Même contenu sans l'historique : exports de listes complètes."""
    historique = None
