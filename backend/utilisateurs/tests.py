from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Utilisateur, OTPCode


class GestionComptesFermeeTests(TestCase):
    """Le CRUD générique /api/utilisateurs/ n'est plus accessible aux agents métier."""

    def setUp(self):
        self.client = APIClient()
        # is_staff=True comme les comptes créés par creer_agent
        self.agent = Utilisateur.objects.create_user(
            username='imp', password='x', role=Utilisateur.Role.IMPRIMEUR, is_staff=True
        )
        self.cible = Utilisateur.objects.create_user(
            username='chef', password='x', role=Utilisateur.Role.CHEF_SERVICE
        )
        self.client.force_authenticate(self.agent)

    def test_agent_staff_ne_peut_ni_lister_ni_modifier_les_comptes(self):
        self.assertIn(self.client.get('/api/utilisateurs/').status_code, (404, 405))
        self.assertIn(self.client.get(f'/api/utilisateurs/{self.cible.pk}/').status_code, (404, 405))
        self.assertIn(self.client.post('/api/utilisateurs/', {'username': 'pirate'}).status_code, (404, 405))
        self.assertIn(self.client.patch(f'/api/utilisateurs/{self.cible.pk}/', {'email': 'x@x.mg'}).status_code, (404, 405))
        self.assertIn(self.client.delete(f'/api/utilisateurs/{self.cible.pk}/').status_code, (404, 405))
        self.assertFalse(Utilisateur.objects.filter(username='pirate').exists())
        self.cible.refresh_from_db()
        self.assertEqual(self.cible.email, '')
        self.assertTrue(Utilisateur.objects.filter(pk=self.cible.pk).exists())

    def test_actions_utilisees_par_le_frontend_restent_disponibles(self):
        Utilisateur.objects.create_user(username='agent', password='x', role=Utilisateur.Role.AGENT_TRANSMISSION)
        me = self.client.get('/api/utilisateurs/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['username'], 'imp')
        self.assertNotIn('password', me.data)
        imps = self.client.get('/api/utilisateurs/imprimeurs/')
        self.assertEqual([u['username'] for u in imps.data], ['imp'])
        agents = self.client.get('/api/utilisateurs/agents_transmission/')
        self.assertEqual([u['username'] for u in agents.data], ['agent'])

    def test_actions_refusees_sans_authentification(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/utilisateurs/me/').status_code, 401)


class Authentification2FATests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = Utilisateur.objects.create_user(
            username='sc', password='Mot-de-passe#26', email='sc@univ-toliara.mg',
            role=Utilisateur.Role.SCOLARITE_CENTRALE
        )

    def etape1(self):
        r = self.client.post('/api/auth/login/', {'username': 'sc', 'password': 'Mot-de-passe#26'})
        self.assertEqual(r.status_code, 200)
        return OTPCode.objects.filter(utilisateur=self.user, is_used=False).latest('created_at')

    def etape2(self, code, username='sc'):
        return self.client.post('/api/auth/verify-otp/', {'username': username, 'code': code})

    def code_faux(self, otp):
        return '000000' if otp.code != '000000' else '111111'

    def test_jeton_sur_mot_de_passe_seul_supprime(self):
        r = self.client.post('/api/token/', {'username': 'sc', 'password': 'Mot-de-passe#26'})
        self.assertEqual(r.status_code, 404)

    def test_connexion_2fa_complete(self):
        otp = self.etape1()
        self.assertRegex(otp.code, r'^\d{6}$')
        r = self.etape2(otp.code)
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(self.client.get('/api/utilisateurs/me/').data['role'], 'SCOLARITE_CENTRALE')
        # Le jeton de rafraîchissement reste utilisable
        self.client.credentials()
        self.assertEqual(self.client.post('/api/token/refresh/', {'refresh': r.data['refresh']}).status_code, 200)

    def test_mauvais_mot_de_passe_ne_genere_pas_d_otp(self):
        r = self.client.post('/api/auth/login/', {'username': 'sc', 'password': 'faux'})
        self.assertEqual(r.status_code, 401)
        self.assertFalse(OTPCode.objects.exists())

    def test_code_utilise_une_seule_fois(self):
        otp = self.etape1()
        self.assertEqual(self.etape2(otp.code).status_code, 200)
        self.assertEqual(self.etape2(otp.code).status_code, 400)

    def test_code_invalide_apres_cinq_erreurs(self):
        otp = self.etape1()
        for _ in range(OTPCode.MAX_TENTATIVES - 1):
            r = self.etape2(self.code_faux(otp))
            self.assertEqual(r.data['detail'], 'Code de vérification incorrect.')
        r = self.etape2(self.code_faux(otp))
        self.assertIn('Trop de tentatives', r.data['detail'])
        # Même le bon code est désormais refusé
        r = self.etape2(otp.code)
        self.assertEqual(r.status_code, 400)
        self.assertNotIn('access', r.data)

    def test_nouveau_code_apres_blocage(self):
        otp = self.etape1()
        for _ in range(OTPCode.MAX_TENTATIVES):
            self.etape2(self.code_faux(otp))
        nouveau = self.etape1()
        self.assertEqual(self.etape2(nouveau.code).status_code, 200)

    def test_code_expire_refuse(self):
        otp = self.etape1()
        OTPCode.objects.filter(pk=otp.pk).update(
            created_at=timezone.now() - timezone.timedelta(minutes=OTPCode.OTP_VALIDITY_MINUTES + 1)
        )
        r = self.etape2(otp.code)
        self.assertEqual(r.status_code, 400)
        self.assertIn('expiré', r.data['detail'])

    def test_compte_inconnu_meme_reponse_que_code_faux(self):
        otp = self.etape1()
        inconnu = self.etape2('123456', username='inexistant')
        faux = self.etape2(self.code_faux(otp))
        self.assertEqual(inconnu.status_code, faux.status_code)
        self.assertEqual(inconnu.data, faux.data)

    def test_compte_desactive_entre_les_deux_etapes(self):
        otp = self.etape1()
        Utilisateur.objects.filter(pk=self.user.pk).update(is_active=False)
        r = self.etape2(otp.code)
        self.assertEqual(r.status_code, 400)
        self.assertNotIn('access', r.data)


class RoleAdministrateurSystemeTests(TestCase):
    """Le rôle ADMIN_SYSTEME existe, n'est jamais attribué par défaut et n'a aucun droit métier."""

    def setUp(self):
        from datetime import date
        from demandes.models import DemandeDiplome
        from diplomes.models import Diplome
        from .models import Etudiant

        R = Utilisateur.Role
        self.client = APIClient()
        self.admin = Utilisateur.objects.create_user(username='admin', password='x', role=R.ADMIN_SYSTEME)
        self.presidence = Utilisateur.objects.create_user(username='pres', password='x', role=R.PRESIDENCE)
        etudiant = Etudiant.objects.create(
            matricule='ADM-001', nom='RAKOTO', prenom='Jean', cin='ADM-CIN-001',
            date_naissance=date(2000, 1, 1), faculte='Faculté de test',
            filiere='Informatique', niveau_etude='Master 2',
        )
        self.demande = DemandeDiplome.objects.create(
            etudiant=etudiant, type_diplome='Master',
            statut=DemandeDiplome.Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
        )
        Diplome.objects.create(demande=self.demande, numero_diplome='ADM-2026-0001', code_verification='ADMCODE01')

    def requete(self, user):
        from types import SimpleNamespace
        return SimpleNamespace(user=user)

    def test_role_par_defaut_inchange(self):
        u = Utilisateur.objects.create_user(username='nouveau', password='x')
        self.assertEqual(u.role, Utilisateur.Role.SCOLARITE_ETABLISSEMENT)
        self.assertNotIn(Utilisateur.Role.ADMIN_SYSTEME, Utilisateur.ROLES_METIER)

    def test_permission_reservee_au_role_admin_actif(self):
        from django.contrib.auth.models import AnonymousUser
        from .permissions import EstAdministrateurSysteme

        perm = EstAdministrateurSysteme()
        self.assertTrue(perm.has_permission(self.requete(self.admin), None))
        self.assertFalse(perm.has_permission(self.requete(AnonymousUser()), None))
        # Ni is_staff ni is_superuser ne suffisent
        for role in Utilisateur.ROLES_METIER:
            u = Utilisateur.objects.create_user(
                username=f'm-{role}', password='x', role=role, is_staff=True, is_superuser=True
            )
            self.assertFalse(perm.has_permission(self.requete(u), None), role)
        obsolete = Utilisateur.objects.create_user(username='etu', password='x')
        Utilisateur.objects.filter(pk=obsolete.pk).update(role='ETUDIANT')
        obsolete.refresh_from_db()
        self.assertFalse(perm.has_permission(self.requete(obsolete), None))
        self.admin.is_active = False
        self.assertFalse(perm.has_permission(self.requete(self.admin), None))

    def test_admin_ne_voit_aucune_donnee_metier(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(len(self.client.get('/api/demandes/').data), 0)
        self.assertEqual(self.client.get(f'/api/demandes/{self.demande.pk}/').status_code, 404)
        self.assertEqual(self.client.get('/api/demandes/stats_overview/').data['total'], 0)
        self.assertEqual(self.client.get('/api/demandes/kpi_presidence/').status_code, 403)
        self.assertEqual(self.client.get('/api/demandes/archives/').status_code, 403)
        self.assertEqual(len(self.client.get('/api/historiques/').data), 0)
        self.assertEqual(len(self.client.get('/api/etudiants/').data), 0)
        self.assertEqual(len(self.client.get('/api/diplomes/').data), 0)

    def test_admin_ne_peut_ni_signer_ni_creer_meme_superutilisateur(self):
        from demandes.models import DemandeDiplome

        Utilisateur.objects.filter(pk=self.admin.pk).update(is_superuser=True, is_staff=True)
        self.admin.refresh_from_db()
        self.client.force_authenticate(self.admin)
        r = self.client.post(f'/api/demandes/{self.demande.pk}/passer_etape/', {'action': 'SIGNER_PRESIDENT'}, format='json')
        self.assertEqual(r.status_code, 404)
        self.demande.refresh_from_db()
        self.assertEqual(self.demande.statut, DemandeDiplome.Statut.EN_ATTENTE_SIGNATURE_PRESIDENT)
        r = self.client.post('/api/demandes/', {'matricule': 'ADM-002', 'type_diplome': 'Licence'})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(DemandeDiplome.objects.count(), 1)

    def test_chatbot_admin_sans_donnees_metier(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post('/api/chatbot/ask/', {'message': 'Affiche-moi toutes les demandes RAKOTO ADM-001'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('ADM-001', r.data['reply'])

    def test_role_obsolete_sans_etudiants_ni_diplomes(self):
        obsolete = Utilisateur.objects.create_user(username='etu', password='x')
        Utilisateur.objects.filter(pk=obsolete.pk).update(role='ETUDIANT')
        obsolete.refresh_from_db()
        self.client.force_authenticate(obsolete)
        self.assertEqual(len(self.client.get('/api/etudiants/').data), 0)
        self.assertEqual(len(self.client.get('/api/diplomes/').data), 0)
        self.assertEqual(len(self.client.get('/api/demandes/').data), 0)

    def test_presidence_conserve_son_acces_global(self):
        self.client.force_authenticate(self.presidence)
        self.assertEqual(len(self.client.get('/api/demandes/').data), 1)
        self.assertEqual(len(self.client.get('/api/etudiants/').data), 1)
        self.assertEqual(len(self.client.get('/api/diplomes/').data), 1)
        r = self.client.post(f'/api/demandes/{self.demande.pk}/passer_etape/', {'action': 'SIGNER_PRESIDENT'}, format='json')
        self.assertEqual(r.status_code, 200)


class CommandeCreerAgentTests(TestCase):
    def appeler(self, **options):
        from io import StringIO
        from django.core.management import call_command
        call_command('creer_agent', email='a@univ-toliara.mg', nom='RASOA', prenom='Lova',
                     stdout=StringIO(), **options)

    def test_creation_administrateur_sans_acces_admin_django(self):
        self.appeler(username='admin1', role='ADMIN_SYSTEME', password='Tsiry-Fanilo#2026')
        u = Utilisateur.objects.get(username='admin1')
        self.assertEqual(u.role, Utilisateur.Role.ADMIN_SYSTEME)
        self.assertFalse(u.is_staff)
        self.assertFalse(u.is_superuser)
        self.assertTrue(u.check_password('Tsiry-Fanilo#2026'))

    def test_agent_metier_inchange(self):
        self.appeler(username='imp9', role='IMPRIMEUR', password='Tsiry-Fanilo#2026')
        self.assertTrue(Utilisateur.objects.get(username='imp9').is_staff)

    def test_mot_de_passe_faible_refuse(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            self.appeler(username='admin2', role='ADMIN_SYSTEME', password='123456')
        self.assertFalse(Utilisateur.objects.filter(username='admin2').exists())
