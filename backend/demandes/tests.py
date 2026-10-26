from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from utilisateurs.models import Etudiant, Utilisateur
from .models import DemandeDiplome, Historique


class TransmissionArchivesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.scolarite = Utilisateur.objects.create_user(
            username='scolarite-test', password='test', role=Utilisateur.Role.SCOLARITE_CENTRALE
        )
        self.chef = Utilisateur.objects.create_user(
            username='chef-test', password='test', role=Utilisateur.Role.CHEF_SERVICE
        )
        self.autre_role = Utilisateur.objects.create_user(
            username='imprimeur-test', password='test', role=Utilisateur.Role.IMPRIMEUR
        )
        etudiant = Etudiant.objects.create(
            matricule='TST-001', nom='RAKOTO', prenom='Jean', cin='TST-CIN-001',
            date_naissance=date(2000, 1, 1), faculte='Faculté de test',
            filiere='Informatique', niveau_etude='Master 2',
        )
        self.demande = DemandeDiplome.objects.create(
            etudiant=etudiant, type_diplome='Master', statut=DemandeDiplome.Statut.VALIDEE
        )

    def test_archive_only_after_explicit_transmission_and_syncs_treatment(self):
        self.client.force_authenticate(self.scolarite)
        response = self.client.get('/api/demandes/archives/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        self.client.force_authenticate(self.chef)
        response = self.client.get('/api/demandes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        self.client.force_authenticate(self.scolarite)
        response = self.client.post(
            f'/api/demandes/{self.demande.pk}/passer_etape/',
            {'action': 'TRANSMETTRE_CHEF'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data['date_transmission_chef'])
        self.assertEqual(DemandeDiplome.objects.count(), 1)
        self.assertEqual(Historique.objects.filter(demande=self.demande).count(), 1)
        duplicate = self.client.post(
            f'/api/demandes/{self.demande.pk}/passer_etape/',
            {'action': 'TRANSMETTRE_CHEF'}, format='json'
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(Historique.objects.filter(demande=self.demande).count(), 1)

        self.client.force_authenticate(self.chef)
        response = self.client.get('/api/demandes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [self.demande.pk])
        response = self.client.post(
            f'/api/demandes/{self.demande.pk}/passer_etape/',
            {'action': 'PRENDRE_EN_CHARGE'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['statut'], DemandeDiplome.Statut.EN_TRAITEMENT)

        self.client.force_authenticate(self.scolarite)
        response = self.client.get('/api/demandes/archives/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['statut'], DemandeDiplome.Statut.EN_TRAITEMENT)

    def test_archive_endpoint_is_restricted_to_scolarite_centrale(self):
        self.client.force_authenticate(self.autre_role)
        response = self.client.get('/api/demandes/archives/')
        self.assertEqual(response.status_code, 403)

    def test_validated_request_cannot_be_taken_by_chef_before_transmission(self):
        self.client.force_authenticate(self.chef)
        response = self.client.post(
            f'/api/demandes/{self.demande.pk}/passer_etape/',
            {'action': 'PRENDRE_EN_CHARGE'}, format='json'
        )
        self.assertEqual(response.status_code, 404)


class CoherenceCircuitTests(TestCase):
    """Non-régression : compteurs alignés sur les listes, règles métier côté serveur."""

    def setUp(self):
        self.client = APIClient()
        R = Utilisateur.Role
        self.scolarite = Utilisateur.objects.create_user(username='sc', password='x', role=R.SCOLARITE_CENTRALE)
        self.chef = Utilisateur.objects.create_user(username='chef', password='x', role=R.CHEF_SERVICE)
        self.imp1 = Utilisateur.objects.create_user(username='imp1', password='x', role=R.IMPRIMEUR)
        self.imp2 = Utilisateur.objects.create_user(username='imp2', password='x', role=R.IMPRIMEUR)
        self.etudiant = Etudiant.objects.create(
            matricule='TST-100', nom='RABE', prenom='Paul', cin='CIN-100',
            date_naissance=date(2000, 1, 1), faculte='Faculté de test',
            filiere='Informatique', niveau_etude='Master 2',
        )

    def _demande(self, **kwargs):
        kwargs.setdefault('statut', DemandeDiplome.Statut.VALIDEE)
        return DemandeDiplome.objects.create(etudiant=self.etudiant, type_diplome='Master', **kwargs)

    def _action(self, user, demande, action, **data):
        self.client.force_authenticate(user)
        return self.client.post(f'/api/demandes/{demande.pk}/passer_etape/', {'action': action, **data}, format='json')

    def test_stats_chef_ignorent_les_dossiers_non_transmis(self):
        from django.utils import timezone
        self._demande(date_transmission_chef=timezone.now())
        self._demande()  # validée mais pas encore transmise
        self.client.force_authenticate(self.chef)
        stats = self.client.get('/api/demandes/stats_overview/').data
        liste = self.client.get('/api/demandes/').data
        self.assertEqual(stats['validees'] + stats['en_traitement'], 1)
        self.assertEqual(stats['total'], len(liste))

    def test_validation_refusee_sans_pieces_ou_admission(self):
        d = self._demande(statut=DemandeDiplome.Statut.EN_ATTENTE_VERIFICATION)
        r = self._action(self.scolarite, d, 'VALIDER_SCOLARITE_CENTRALE',
                         has_pv_soutenance=False, admission_etudiant=True)
        self.assertEqual(r.status_code, 400)
        r = self._action(self.scolarite, d, 'VALIDER_SCOLARITE_CENTRALE', admission_etudiant=False)
        self.assertEqual(r.status_code, 400)
        r = self._action(self.scolarite, d, 'VALIDER_SCOLARITE_CENTRALE', has_pv_soutenance=True,
                         admission_etudiant=True)
        self.assertEqual(r.status_code, 200)

    def test_imprimeur_ne_traite_pas_le_dossier_d_un_autre(self):
        d = self._demande(statut=DemandeDiplome.Statut.EN_ATTENTE_IMPRESSION, imprimeur_assigne=self.imp1)
        self.client.force_authenticate(self.imp2)
        self.assertEqual(self.client.get('/api/demandes/').data, [])
        self.assertEqual(self.client.get('/api/demandes/stats_overview/').data['en_attente_imp'], 0)
        self.assertEqual(self._action(self.imp2, d, 'LANCER_IMPRESSION').status_code, 404)
        self.assertEqual(self._action(self.imp1, d, 'LANCER_IMPRESSION').status_code, 200)

    def test_affectation_imprimeur_invalide_rejetee(self):
        from django.utils import timezone
        d = self._demande(date_transmission_chef=timezone.now())
        self.assertEqual(self._action(self.chef, d, 'PRENDRE_EN_CHARGE').status_code, 200)
        r = self._action(self.chef, d, 'AFFECTER_IMPRIMEUR', imprimeur_id=self.scolarite.id)
        self.assertEqual(r.status_code, 400)
        d.refresh_from_db()
        self.assertEqual(d.statut, DemandeDiplome.Statut.EN_TRAITEMENT)

    def test_prise_en_charge_obligatoire_avant_imprimeur(self):
        from django.utils import timezone
        d = self._demande(date_transmission_chef=timezone.now())
        r = self._action(self.chef, d, 'AFFECTER_IMPRIMEUR', imprimeur_id=self.imp1.id)
        self.assertEqual(r.status_code, 409)  # étape non autorisée depuis « Validée »
        d.refresh_from_db()
        self.assertEqual(d.statut, DemandeDiplome.Statut.VALIDEE)
        self.assertEqual(self._action(self.chef, d, 'PRENDRE_EN_CHARGE').status_code, 200)
        self.assertEqual(self._action(self.chef, d, 'AFFECTER_IMPRIMEUR', imprimeur_id=self.imp1.id).status_code, 200)
        d.refresh_from_db()
        self.assertEqual(d.statut, DemandeDiplome.Statut.EN_ATTENTE_IMPRESSION)

    def test_historique_limite_aux_dossiers_visibles(self):
        d = self._demande()
        Historique.objects.create(demande=d, utilisateur=self.scolarite, role_utilisateur='SCOLARITE_CENTRALE',
                                  action_realisee='test', nouveau_statut=DemandeDiplome.Statut.VALIDEE)
        self.client.force_authenticate(self.chef)
        self.assertEqual(len(self.client.get('/api/historiques/').data), 0)

    def test_numero_diplome_non_reattribue_apres_suppression(self):
        from diplomes.models import Diplome
        d1, d2 = self._demande(), self._demande()
        Diplome.objects.create(demande=d1, numero_diplome='UT-2026-00001', code_verification='A1')
        Diplome.objects.create(demande=d2, numero_diplome='UT-2026-00002', code_verification='A2')
        Diplome.objects.get(numero_diplome='UT-2026-00001').delete()
        self.assertEqual(Diplome.generer_numero(2026), 'UT-2026-00003')

    def test_fiche_etudiant_non_supprimable(self):
        self.client.force_authenticate(self.imp1)
        r = self.client.delete(f'/api/etudiants/{self.etudiant.pk}/')
        self.assertEqual(r.status_code, 405)

    def test_presidence_peut_uniquement_confirmer_sa_signature(self):
        pres = Utilisateur.objects.create_user(username='pres', password='x', role=Utilisateur.Role.PRESIDENCE)
        d = self._demande(statut=DemandeDiplome.Statut.EN_ATTENTE_SIGNATURE_PRESIDENT)
        self.assertEqual(self._action(pres, d, 'ACHEMINER_RETOUR').status_code, 403)
        r = self._action(pres, d, 'SIGNER_PRESIDENT', mention='Bien')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['statut'], DemandeDiplome.Statut.SIGNE_PRESIDENT)

    def test_chef_ne_peut_plus_refuser_ni_acheminer(self):
        from django.utils import timezone
        d = self._demande(date_transmission_chef=timezone.now())
        self.assertEqual(self._action(self.chef, d, 'REFUSER', observations='x').status_code, 403)
        d2 = self._demande(statut=DemandeDiplome.Statut.EN_TRANSMISSION_PRESIDENT, date_transmission_chef=timezone.now())
        self.assertEqual(self._action(self.chef, d2, 'REMETTRE_PRESIDENCE').status_code, 403)
        self.assertEqual(self._action(self.scolarite, d, 'MARQUER_INCOMPLET').status_code, 400)
