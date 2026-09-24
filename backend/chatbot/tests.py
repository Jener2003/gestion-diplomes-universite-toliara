from django.test import TestCase
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status

from utilisateurs.models import Utilisateur, Etudiant
from demandes.models import DemandeDiplome
from diplomes.models import Diplome
from chatbot.services import ChatbotSecurityService


class ChatbotPersonnelSecurityTestCase(TestCase):
    def setUp(self):
        # 1. Scolarité Établissement
        self.user_scol_etab = Utilisateur.objects.create_user(
            username='scol_etab',
            password='Password123!',
            role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
            etablissement='Faculté des Sciences',
            first_name='Aina',
            last_name='Scolarite'
        )

        # 2. Scolarité Centrale
        self.user_scolarite = Utilisateur.objects.create_user(
            username='scolarite_centrale',
            password='Password123!',
            role=Utilisateur.Role.SCOLARITE_CENTRALE,
            first_name='Mialy',
            last_name='Centrale'
        )

        # 3. Chef de Service
        self.user_chef = Utilisateur.objects.create_user(
            username='chef_service',
            password='Password123!',
            role=Utilisateur.Role.CHEF_SERVICE,
            first_name='Mika',
            last_name='Chef'
        )

        # 4. Imprimeur
        self.user_imprimeur = Utilisateur.objects.create_user(
            username='imprimeur_user',
            password='Password123!',
            role=Utilisateur.Role.IMPRIMEUR,
            first_name='Jean',
            last_name='Imprimeur'
        )

        # 5. Agent Transmission
        self.user_trans = Utilisateur.objects.create_user(
            username='trans_user',
            password='Password123!',
            role=Utilisateur.Role.AGENT_TRANSMISSION,
            first_name='Faly',
            last_name='Transmission'
        )

        # 6. Présidence
        self.user_presidence = Utilisateur.objects.create_user(
            username='president_user',
            password='Password123!',
            role=Utilisateur.Role.PRESIDENCE,
            first_name='Pr.',
            last_name='President'
        )

        # Création d'étudiants dans le registre universitaire
        self.etudiant_1 = Etudiant.objects.create(
            matricule='MAT-2026-001',
            nom='Rakoto',
            prenom='Jean',
            date_naissance=date(2000, 1, 1),
            cin='CIN-001',
            faculte='Faculté des Sciences',
            filiere='Informatique',
            niveau_etude='Master 2'
        )

        self.etudiant_2 = Etudiant.objects.create(
            matricule='MAT-2026-002',
            nom='Rasoa',
            prenom='Marie',
            date_naissance=date(2001, 2, 2),
            cin='CIN-002',
            faculte='Faculté de Médecine',
            filiere='Médecine Générale',
            niveau_etude='Doctorat'
        )

        # Dossier 1 en attente de vérification par Scolarité Centrale
        self.demande_1 = DemandeDiplome.objects.create(
            etudiant=self.etudiant_1,
            type_diplome='Master Informatique',
            statut=DemandeDiplome.Statut.EN_ATTENTE_VERIFICATION,
            etablissement_origine='Faculté des Sciences'
        )

        # Dossier 2 validé en attente d'affectation
        self.demande_2 = DemandeDiplome.objects.create(
            etudiant=self.etudiant_2,
            type_diplome='Doctorat Médecine',
            statut=DemandeDiplome.Statut.VALIDEE,
            etablissement_origine='Faculté de Médecine'
        )

        self.client = APIClient()

    def test_scolarite_centrale_sees_pending_verification(self):
        """La Scolarité Centrale voit les demandes reçues en attente de vérification d'admission."""
        res = ChatbotSecurityService.process_message(self.user_scolarite, "Combien de demandes en attente ?")
        self.assertIn("Demandes en attente de vérification d'admission : 1", res["reply"])
        self.assertIn("Rakoto Jean", res["reply"])

    def test_chef_service_sees_ready_for_assignment(self):
        """Le Chef de Service reçoit les informations sur les dossiers validés à affecter."""
        res = ChatbotSecurityService.process_message(self.user_chef, "Quels dossiers à affecter pour impression ?")
        self.assertIn("Dossiers validés à affecter pour impression : 1", res["reply"])
        self.assertIn("Rasoa Marie", res["reply"])

    def test_imprimeur_sees_printing_queue_and_security(self):
        """L'Imprimeur interroge l'état de la file d'impression et les règles anti-fraude."""
        res = ChatbotSecurityService.process_message(self.user_imprimeur, "Comment fonctionne la numérotation ?")
        self.assertIn("UT-AAAA-NNNNN", res["reply"])
        self.assertIn("Code de vérification", res["reply"])

    def test_presidence_sees_executive_kpi_and_signatures(self):
        """La Présidence accède aux KPI exécutifs et aux diplômes à signer."""
        res = ChatbotSecurityService.process_message(self.user_presidence, "Quels sont les KPI stratégiques ?")
        self.assertIn("Tableau de Bord Exécutif", res["reply"])
        self.assertIn("Délai moyen de délivrance", res["reply"])

    def test_api_endpoint_requires_auth(self):
        """L'API /api/chatbot/ask/ bloque tout accès non authentifié (401)."""
        response = self.client.post('/api/chatbot/ask/', {'message': 'Bonjour'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_endpoint_responds_for_authenticated_personnel(self):
        """L'API répond correctement pour un personnel authentifié."""
        self.client.force_authenticate(user=self.user_scolarite)
        response = self.client.post('/api/chatbot/ask/', {'message': 'Combien de demandes en attente ?'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Demandes en attente de vérification", response.data["reply"])
