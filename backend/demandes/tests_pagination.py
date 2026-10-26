from datetime import date

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from utilisateurs.models import Etudiant, Utilisateur
from .models import DemandeDiplome, Historique

Statut = DemandeDiplome.Statut


class ListePagineeTests(TestCase):
    """Liste des demandes : pagination, onglets et compteurs calculés par le serveur."""

    def setUp(self):
        self.sc = Utilisateur.objects.create_user(username='sc', password='x', role=Utilisateur.Role.SCOLARITE_CENTRALE)
        self.imp = Utilisateur.objects.create_user(username='imp', password='x', role=Utilisateur.Role.IMPRIMEUR)
        self.client = APIClient()
        self.client.force_authenticate(self.sc)
        self.compteur = 0

    def creer(self, statut, nombre=1, transmise=False, type_diplome='Master', imprimeur=None):
        for _ in range(nombre):
            self.compteur += 1
            etudiant = Etudiant.objects.create(
                matricule=f'M{self.compteur:04d}', nom='RABE', prenom='Hery', cin=f'C{self.compteur:06d}',
                date_naissance=date(2000, 1, 1), faculte='Sciences', filiere='Informatique', niveau_etude='M2')
            demande = DemandeDiplome.objects.create(
                etudiant=etudiant, type_diplome=type_diplome, statut=statut, agent_responsable=self.sc,
                imprimeur_assigne=imprimeur, date_transmission_chef=timezone.now() if transmise else None)
            Historique.objects.create(demande=demande, utilisateur=self.sc, action_realisee='Création',
                                      nouveau_statut=statut)

    def test_sans_page_la_liste_reste_complete(self):
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 3)
        r = self.client.get('/api/demandes/')
        self.assertIsInstance(r.data, list)
        self.assertEqual(len(r.data), 3)

    def test_pagination(self):
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 30)
        r = self.client.get('/api/demandes/', {'page': 1})
        self.assertEqual((r.data['count'], len(r.data['results'])), (30, 25))
        r = self.client.get('/api/demandes/', {'page': 2})
        self.assertEqual(len(r.data['results']), 5)
        r = self.client.get('/api/demandes/', {'page': 1, 'page_size': 10})
        self.assertEqual(len(r.data['results']), 10)

    def test_pages_sans_doublon_ni_oubli(self):
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 12)
        ids = []
        for page in (1, 2, 3):
            ids += [d['id'] for d in self.client.get('/api/demandes/', {'page': page, 'page_size': 5}).data['results']]
        self.assertEqual(sorted(ids), sorted(DemandeDiplome.objects.values_list('id', flat=True)))

    def test_onglets_et_compteurs(self):
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 2)
        self.creer(Statut.DOSSIER_INCOMPLET, 1)
        self.creer(Statut.VALIDEE, 2)
        self.creer(Statut.VALIDEE, 1, transmise=True)   # aux archives : hors « validées » pour la Scolarité
        self.creer(Statut.REFUSEE, 4)
        r = self.client.get('/api/demandes/', {'page': 1, 'onglet': 'A_TRAITER'})
        self.assertEqual(r.data['count'], 3)
        self.assertEqual({d['statut'] for d in r.data['results']}, {'EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'})
        compteurs = r.data['compteurs']
        self.assertEqual((compteurs['A_TRAITER'], compteurs['VALIDEES'], compteurs['REJETEES']), (3, 2, 4))
        self.assertEqual(self.client.get('/api/demandes/', {'page': 1, 'onglet': 'VALIDEES'}).data['count'], 2)

    def test_compteurs_suivent_les_filtres(self):
        self.creer(Statut.REFUSEE, 2, type_diplome='Licence')
        self.creer(Statut.REFUSEE, 3, type_diplome='Master')
        r = self.client.get('/api/demandes/', {'page': 1, 'type_diplome': 'licence'})
        self.assertEqual((r.data['count'], r.data['compteurs']['REJETEES']), (2, 2))

    def test_statut_hors_perimetre_dans_son_onglet(self):
        # « Disponible » est affiché « En retour » : il doit apparaître dans le même onglet
        self.creer(Statut.DISPONIBLE, 1)
        self.creer(Statut.SIGNE_PRESIDENT, 1)
        r = self.client.get('/api/demandes/', {'page': 1, 'onglet': 'NAVETTE_RETOUR'})
        self.assertEqual(r.data['count'], 2)

    def test_onglet_inconnu_sans_filtre(self):
        self.creer(Statut.REFUSEE, 2)
        self.assertEqual(self.client.get('/api/demandes/', {'page': 1, 'onglet': 'ALL'}).data['count'], 2)

    def test_cloisonnement_conserve(self):
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 2)   # invisible pour l'imprimeur
        self.creer(Statut.EN_IMPRESSION, 1, imprimeur=self.imp)
        client = APIClient()
        client.force_authenticate(self.imp)
        self.assertEqual(client.get('/api/demandes/', {'page': 1}).data['count'], 1)

    def test_nombre_de_requetes_constant(self):
        """Le nombre de requêtes SQL ne dépend pas du nombre de dossiers (pas de N+1)."""
        def requetes(params):
            with CaptureQueriesContext(connection) as ctx:
                self.client.get('/api/demandes/', params)
            return len(ctx)

        self.creer(Statut.EN_ATTENTE_VERIFICATION, 3, imprimeur=self.imp)
        petit_page, petit_tout = requetes({'page': 1}), requetes({})
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 20, imprimeur=self.imp)
        self.assertEqual(requetes({'page': 1}), petit_page)
        self.assertEqual(requetes({}), petit_tout)

    def test_export_sans_historique(self):
        self.creer(Statut.EN_ATTENTE_VERIFICATION, 2)
        r = self.client.get('/api/demandes/', {'sans_historique': 1})
        self.assertNotIn('historique', r.data[0])
        self.assertIn('etudiant_details', r.data[0])
        self.assertIn('historique', self.client.get('/api/demandes/').data[0])

    def test_archives_paginees(self):
        self.creer(Statut.EN_TRAITEMENT, 12, transmise=True)
        self.creer(Statut.VALIDEE, 2)   # non transmises : pas aux archives
        r = self.client.get('/api/demandes/archives/', {'page': 1, 'page_size': 10})
        self.assertEqual((r.data['count'], len(r.data['results'])), (12, 10))
        r = self.client.get('/api/demandes/archives/', {'sans_historique': 1})
        self.assertEqual(len(r.data), 12)
        self.assertNotIn('historique', r.data[0])
