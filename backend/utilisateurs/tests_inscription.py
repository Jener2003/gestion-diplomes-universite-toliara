from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from administration.models import AdresseNotificationEquipe, JournalActivite
from .models import OTPCode, Utilisateur

Operation = JournalActivite.Operation
MOT_DE_PASSE = 'Diplomes#Toliara26'
ADRESSE_CHEF = 'chef.service@univ-toliara.mg'


class InscriptionTests(TestCase):
    """Inscription par l'agent : code envoyé à l'adresse commune de l'espace, puis validation admin."""

    def setUp(self):
        cache.clear()  # compteur de limitation des inscriptions
        self.client = APIClient()
        AdresseNotificationEquipe.objects.create(role=Utilisateur.Role.CHEF_SERVICE, email=ADRESSE_CHEF)
        self.admin = Utilisateur.objects.create_user(
            username='adm', password='x', email='adm@univ-toliara.mg', role=Utilisateur.Role.ADMIN_SYSTEME)
        self.client_admin = APIClient()
        self.client_admin.force_authenticate(self.admin)

    def inscrire(self, **donnees):
        valeurs = {'username': 'rabe', 'first_name': 'Hery', 'last_name': 'RABE', 'role': 'CHEF_SERVICE',
                   'password': MOT_DE_PASSE, 'confirmation': MOT_DE_PASSE}
        valeurs.update(donnees)
        return self.client.post('/api/auth/inscription/', valeurs, format='json')

    def code(self, username='rabe'):
        return OTPCode.objects.filter(utilisateur__username=username, is_used=False).latest('created_at').code

    def confirmer(self, code, username='rabe'):
        return self.client.post('/api/auth/inscription/confirmer/', {'username': username, 'code': code}, format='json')

    def connexion(self, username='rabe', password=MOT_DE_PASSE):
        return self.client.post('/api/auth/login/', {'username': username, 'password': password})

    def compte(self, username='rabe'):
        return Utilisateur.objects.get(username=username)

    # ── Espaces ouverts ─────────────────────────────────────────────────────
    def test_seuls_les_espaces_configures_sont_proposes(self):
        r = self.client.get('/api/auth/inscription/espaces/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([e['code'] for e in r.data], ['CHEF_SERVICE'])
        self.assertNotIn(ADRESSE_CHEF, str(r.data))

    def test_espace_non_configure_refuse(self):
        r = self.inscrire(role='IMPRIMEUR')
        self.assertEqual(r.status_code, 400)
        self.assertIn('role', r.data)

    def test_administrateur_non_proposable(self):
        self.assertEqual(self.inscrire(role='ADMIN_SYSTEME').status_code, 400)

    # ── Parcours complet ────────────────────────────────────────────────────
    def test_parcours_complet(self):
        r = self.inscrire()
        self.assertEqual(r.status_code, 201)
        compte = self.compte()
        self.assertFalse(compte.is_active)
        self.assertEqual(compte.inscription, Utilisateur.Inscription.CODE_A_CONFIRMER)
        self.assertEqual(compte.email, '')
        self.assertTrue(compte.check_password(MOT_DE_PASSE))
        # Le code part à l'adresse commune de l'espace
        self.assertEqual(mail.outbox[-1].to, [ADRESSE_CHEF])
        self.assertIn(self.code(), mail.outbox[-1].body)

        self.assertEqual(self.confirmer(self.code()).status_code, 200)
        self.assertEqual(self.compte().inscription, Utilisateur.Inscription.EN_ATTENTE)
        self.assertFalse(self.compte().is_active)

        # Pas de connexion avant la validation, avec un message explicite
        r = self.connexion()
        self.assertEqual(r.status_code, 403)
        self.assertIn('attente', r.data['detail'])

        r = self.client_admin.post(f'/api/administration/utilisateurs/{compte.pk}/activer/')
        self.assertEqual(r.status_code, 200)
        compte = self.compte()
        self.assertTrue(compte.is_active)
        self.assertEqual(compte.inscription, '')
        self.assertEqual(JournalActivite.objects.latest('id').operation, Operation.INSCRIPTION_VALIDEE)

        # Connexion : le code de connexion part aussi à l'adresse de l'espace
        r = self.connexion()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(mail.outbox[-1].to, [ADRESSE_CHEF])
        r = self.client.post('/api/auth/verify-otp/', {'username': 'rabe', 'code': self.code()})
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)

    def test_mauvais_code_puis_blocage(self):
        self.inscrire()
        bon = self.code()
        faux = '000000' if bon != '000000' else '111111'
        for _ in range(OTPCode.MAX_TENTATIVES - 1):
            self.assertEqual(self.confirmer(faux).status_code, 400)
        r = self.confirmer(faux)
        self.assertIn('Trop de tentatives', r.data['detail'])
        self.assertEqual(self.confirmer(bon).status_code, 400)
        self.assertEqual(self.compte().inscription, Utilisateur.Inscription.CODE_A_CONFIRMER)

    def test_admin_ne_peut_valider_un_code_non_confirme(self):
        self.inscrire()
        r = self.client_admin.post(f'/api/administration/utilisateurs/{self.compte().pk}/activer/')
        self.assertEqual(r.status_code, 409)
        self.assertFalse(self.compte().is_active)

    def test_connexion_avant_confirmation(self):
        self.inscrire()
        r = self.connexion()
        self.assertEqual(r.status_code, 403)
        self.assertIn('pas terminée', r.data['detail'])

    def test_mauvais_mot_de_passe_ne_revele_pas_l_inscription(self):
        self.inscrire()
        r = self.connexion(password='Mauvais#2026')
        self.assertEqual(r.status_code, 401)
        self.assertNotIn('inscription', r.data)

    # ── Identifiants ────────────────────────────────────────────────────────
    def test_identifiant_deja_utilise(self):
        Utilisateur.objects.create_user(username='rabe', password='x', role=Utilisateur.Role.IMPRIMEUR)
        r = self.inscrire()
        self.assertEqual(r.status_code, 400)
        self.assertIn('username', r.data)

    def test_inscription_non_confirmee_remplacee(self):
        self.inscrire(first_name='Ancien')
        r = self.inscrire(first_name='Nouveau')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Utilisateur.objects.filter(username='rabe').count(), 1)
        self.assertEqual(self.compte().first_name, 'Nouveau')

    def test_inscription_confirmee_non_remplacable(self):
        self.inscrire()
        self.confirmer(self.code())
        self.assertEqual(self.inscrire().status_code, 400)

    def test_mot_de_passe_faible_ou_different(self):
        self.assertIn('password', self.inscrire(password='123456', confirmation='123456').data)
        self.assertIn('confirmation', self.inscrire(confirmation='Autre#Mot2026').data)
        self.assertFalse(Utilisateur.objects.filter(username='rabe').exists())

    # ── Refus par l'administrateur ──────────────────────────────────────────
    def test_refus_supprime_l_inscription(self):
        self.inscrire()
        self.confirmer(self.code())
        pk = self.compte().pk
        r = self.client_admin.post(f'/api/administration/utilisateurs/{pk}/refuser_inscription/')
        self.assertEqual(r.status_code, 204)
        self.assertFalse(Utilisateur.objects.filter(pk=pk).exists())
        entree = JournalActivite.objects.latest('id')
        self.assertEqual((entree.operation, entree.cible_username), (Operation.INSCRIPTION_REFUSEE, 'rabe'))

    def test_refus_impossible_sur_un_compte_normal(self):
        r = self.client_admin.post(f'/api/administration/utilisateurs/{self.admin.pk}/refuser_inscription/')
        self.assertEqual(r.status_code, 409)

    def test_alerte_inscriptions_en_attente(self):
        self.inscrire()
        self.confirmer(self.code())
        alertes = self.client_admin.get('/api/administration/stats/').data['alertes']
        self.assertIn('INSCRIPTIONS_EN_ATTENTE', [a['code'] for a in alertes])

    def test_filtre_en_attente(self):
        self.inscrire()
        r = self.client_admin.get('/api/administration/utilisateurs/', {'actif': 'attente'})
        self.assertEqual([c['username'] for c in r.data], ['rabe'])

    def test_limitation_des_demandes(self):
        for _ in range(20):
            self.inscrire()
        self.assertEqual(self.inscrire().status_code, 429)


class AdresseDesCodesTests(TestCase):
    """Destinataire des codes : adresse de l'espace si configurée, sinon adresse personnelle."""

    def setUp(self):
        self.client = APIClient()
        self.agent = Utilisateur.objects.create_user(
            username='imp', password=MOT_DE_PASSE, email='imp.perso@univ-toliara.mg', role=Utilisateur.Role.IMPRIMEUR)

    def test_sans_adresse_d_espace_adresse_personnelle(self):
        self.client.post('/api/auth/login/', {'username': 'imp', 'password': MOT_DE_PASSE})
        self.assertEqual(mail.outbox[-1].to, ['imp.perso@univ-toliara.mg'])

    def test_adresse_d_espace_prioritaire(self):
        AdresseNotificationEquipe.objects.create(role=Utilisateur.Role.IMPRIMEUR, email='impression@univ-toliara.mg')
        r = self.client.post('/api/auth/login/', {'username': 'imp', 'password': MOT_DE_PASSE})
        self.assertEqual(mail.outbox[-1].to, ['impression@univ-toliara.mg'])
        self.assertEqual(r.data['email_hint'], 'im***@univ-toliara.mg')

    def test_creation_admin_sans_email_si_espace_configure(self):
        admin = Utilisateur.objects.create_user(username='adm', password='x', email='a@u.mg',
                                                role=Utilisateur.Role.ADMIN_SYSTEME)
        client = APIClient()
        client.force_authenticate(admin)
        donnees = {'username': 'chef2', 'first_name': 'Lova', 'last_name': 'RASOA', 'role': 'CHEF_SERVICE', 'email': ''}
        r = client.post('/api/administration/utilisateurs/', donnees, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)
        AdresseNotificationEquipe.objects.create(role=Utilisateur.Role.CHEF_SERVICE, email='chef.service@univ-toliara.mg')
        r = client.post('/api/administration/utilisateurs/', donnees, format='json')
        self.assertEqual(r.status_code, 201)
        # Le lien de mot de passe part à l'adresse de l'espace, faute d'adresse personnelle
        self.assertEqual(mail.outbox[-1].to, ['chef.service@univ-toliara.mg'])
