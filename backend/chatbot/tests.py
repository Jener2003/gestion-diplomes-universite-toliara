from django.test import TestCase
from datetime import date
from django.utils import timezone
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
            first_name='Agent',
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
            etablissement_origine='Faculté de Médecine',
            date_transmission_chef=timezone.now()
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

    def test_scolarite_centrale_quick_access_queries(self):
        """Vérifie l'accès rapide aux données par questions en langage naturel."""
        # A. Total des demandes
        res_total = ChatbotSecurityService.process_message(self.user_scolarite, "Combien de demandes de diplômes avons-nous reçues ?")
        self.assertIn("Bilan global des demandes", res_total["reply"])
        self.assertIn("2 dossier(s) au total", res_total["reply"])

        # A. Demandes validées
        res_val = ChatbotSecurityService.process_message(self.user_scolarite, "Affiche-moi toutes les demandes validées.")
        self.assertIn("Demandes actuellement validées : 1", res_val["reply"])
        self.assertIn("Rasoa Marie", res_val["reply"])

        # B. Recherche par nom d'étudiant
        res_nom = ChatbotSecurityService.process_message(self.user_scolarite, "Retrouve la demande de l'étudiant Rakoto")
        self.assertIn("Dossier trouvé pour « Rakoto »", res_nom["reply"])
        self.assertIn("Master Informatique", res_nom["reply"])

        # B. Recherche par référence
        res_ref = ChatbotSecurityService.process_message(self.user_scolarite, f"Recherche la demande portant la référence #{self.demande_1.id}")
        self.assertIn(f"Demande #{self.demande_1.id}", res_ref["reply"])
        self.assertIn("Rakoto Jean", res_ref["reply"])

        # B. Recherche par cycle
        res_cycle = ChatbotSecurityService.process_message(self.user_scolarite, "Quelles demandes concernent les étudiants en Master ?")
        self.assertIn("Demandes concernant les étudiants en Master : 1", res_cycle["reply"])

        # E. Question académique diplôme précédent
        res_acad = ChatbotSecurityService.process_message(self.user_scolarite, "Quelle est l’année d’obtention du diplôme précédent de cet étudiant ?")
        self.assertIn("diplôme demandé", res_acad["reply"])
        self.assertIn("pas consignée", res_acad["reply"])

        # E. Admission vérifiée
        res_adm = ChatbotSecurityService.process_message(self.user_scolarite, f"L'admission de cet étudiant a-t-elle été vérifiée pour #{self.demande_1.id} ?")
        self.assertIn("Statut du contrôle d'admission", res_adm["reply"])



class ChatbotCloisonnementTestCase(TestCase):
    """Chaque chatbot ne répond qu'avec les données de l'espace de l'utilisateur connecté."""

    def setUp(self):
        Statut = DemandeDiplome.Statut
        self.imprimeur_a = Utilisateur.objects.create_user(username='imp_a', password='x', role=Utilisateur.Role.IMPRIMEUR)
        self.imprimeur_b = Utilisateur.objects.create_user(username='imp_b', password='x', role=Utilisateur.Role.IMPRIMEUR)
        self.agent = Utilisateur.objects.create_user(username='agent', password='x', role=Utilisateur.Role.AGENT_TRANSMISSION)
        self.etab_sciences = Utilisateur.objects.create_user(
            username='etab_sc', password='x', role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT, etablissement='Faculté des Sciences'
        )
        self.etab_sans_rattachement = Utilisateur.objects.create_user(
            username='etab_vide', password='x', role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT, etablissement=''
        )
        self.centrale = Utilisateur.objects.create_user(username='centrale', password='x', role=Utilisateur.Role.SCOLARITE_CENTRALE)
        self.chef = Utilisateur.objects.create_user(username='chef', password='x', role=Utilisateur.Role.CHEF_SERVICE)

        etu_sc = Etudiant.objects.create(
            matricule='SC-1', nom='Randria', prenom='Paul', date_naissance=date(2000, 1, 1),
            cin='C-SC-1', faculte='Faculté des Sciences', filiere='Physique', niveau_etude='Licence'
        )
        etu_med = Etudiant.objects.create(
            matricule='MED-1', nom='Vola', prenom='Hery', date_naissance=date(2000, 1, 1),
            cin='C-MED-1', faculte='Faculté de Médecine', filiere='Médecine', niveau_etude='Doctorat'
        )
        # Dossier en début de circuit, à la Faculté de Médecine
        self.dossier_medecine = DemandeDiplome.objects.create(
            etudiant=etu_med, type_diplome='Doctorat Médecine',
            statut=Statut.EN_ATTENTE_VERIFICATION, etablissement_origine='Faculté de Médecine'
        )
        # Dossier en impression, assigné à l'imprimeur B
        self.dossier_imprimeur_b = DemandeDiplome.objects.create(
            etudiant=etu_sc, type_diplome='Licence Physique',
            statut=Statut.EN_IMPRESSION, etablissement_origine='Faculté des Sciences',
            imprimeur_assigne=self.imprimeur_b
        )

    def ask(self, user, message):
        return ChatbotSecurityService.process_message(user, message)["reply"]

    def test_imprimeur_ne_voit_pas_dossier_hors_file(self):
        reply = self.ask(self.imprimeur_a, f"Recherche le dossier #{self.dossier_medecine.id}")
        self.assertIn("Aucune demande trouvée", reply)
        self.assertNotIn("Vola", reply)

    def test_imprimeur_ne_voit_pas_dossier_assigne_a_un_autre(self):
        reply = self.ask(self.imprimeur_a, f"Recherche le dossier #{self.dossier_imprimeur_b.id}")
        self.assertNotIn("Randria", reply)
        self.assertIn("Randria", self.ask(self.imprimeur_b, f"Recherche le dossier #{self.dossier_imprimeur_b.id}"))

    def test_historique_hors_perimetre_refuse(self):
        reply = self.ask(self.agent, f"Donne-moi l'historique de la demande #{self.dossier_medecine.id}")
        self.assertIn("introuvable dans votre périmètre", reply)

    def test_recherche_par_nom_hors_perimetre(self):
        self.assertNotIn("Vola", self.ask(self.agent, "Retrouve la demande de l'étudiant Vola"))
        self.assertNotIn("Vola", self.ask(self.etab_sciences, "Retrouve la demande de l'étudiant Vola"))

    def test_statistiques_limitees_au_perimetre(self):
        reply = self.ask(self.etab_sciences, "Combien de demandes de diplômes avons-nous reçues ?")
        self.assertIn("1 dossier(s) au total", reply)

    def test_etablissement_sans_rattachement_ne_voit_rien(self):
        reply = self.ask(self.etab_sans_rattachement, "Combien de demandes de diplômes avons-nous reçues ?")
        self.assertIn("0 dossier(s) au total", reply)

    def test_centrale_voit_toutes_les_demandes(self):
        reply = self.ask(self.centrale, "Combien de demandes de diplômes avons-nous reçues ?")
        self.assertIn("2 dossier(s) au total", reply)

    def test_chef_ne_voit_que_les_dossiers_transmis(self):
        """Le dossier en attente de vérification appartient à l'espace de la Scolarité Centrale."""
        reply = self.ask(self.chef, f"Recherche le dossier #{self.dossier_medecine.id}")
        self.assertIn("Aucune demande trouvée", reply)
        self.assertNotIn("Vola", reply)

    def test_etablissement_correspondance_exacte(self):
        """« Faculté des Sciences » ne voit pas un établissement dont le nom la contient."""
        etu = Etudiant.objects.create(
            matricule='SCM-1', nom='Tiana', prenom='Lova', date_naissance=date(2000, 1, 1),
            cin='C-SCM-1', faculte='Faculté des Sciences Marines', filiere='Océanographie', niveau_etude='Master'
        )
        DemandeDiplome.objects.create(
            etudiant=etu, type_diplome='Master Océanographie',
            statut=DemandeDiplome.Statut.EN_ATTENTE_VERIFICATION, etablissement_origine='Faculté des Sciences Marines'
        )
        self.assertNotIn("Tiana", self.ask(self.etab_sciences, "Retrouve la demande de l'étudiant Tiana"))

    def test_role_obsolete_ne_voit_rien(self):
        ancien = Utilisateur.objects.create_user(username='etu_old', password='x')
        Utilisateur.objects.filter(pk=ancien.pk).update(role='ETUDIANT')
        ancien.refresh_from_db()
        reply = self.ask(ancien, f"Recherche le dossier #{self.dossier_medecine.id}")
        self.assertNotIn("Vola", reply)
