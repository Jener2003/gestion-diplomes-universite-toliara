import json

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from utilisateurs.models import Utilisateur, OTPCode
from .models import AdresseNotificationEquipe, JournalActivite
from .services import journaliser

Operation = JournalActivite.Operation
MOT_DE_PASSE = 'Mot-de-passe#26'


class JournalSecuriteConnexionTests(TestCase):
    """Chaque issue de la connexion 2FA est tracée, sans aucun secret."""

    def setUp(self):
        self.client = APIClient()
        self.user = Utilisateur.objects.create_user(
            username='sc', password=MOT_DE_PASSE, email='sc@univ-toliara.mg',
            role=Utilisateur.Role.SCOLARITE_CENTRALE
        )

    def etape1(self, username='sc', password=MOT_DE_PASSE):
        return self.client.post('/api/auth/login/', {'username': username, 'password': password})

    def etape2(self, code, username='sc'):
        return self.client.post('/api/auth/verify-otp/', {'username': username, 'code': code})

    def otp(self):
        return OTPCode.objects.filter(utilisateur=self.user, is_used=False).latest('created_at')

    def code_faux(self, otp):
        return '000000' if otp.code != '000000' else '111111'

    def derniere(self):
        return JournalActivite.objects.latest('id')

    def assert_sans_secret(self, *secrets):
        contenu = json.dumps(list(JournalActivite.objects.values()), default=str)
        for secret in secrets:
            self.assertNotIn(secret, contenu)

    def test_connexion_reussie(self):
        self.etape1()
        otp = self.otp()
        self.assertEqual(self.etape2(otp.code).status_code, 200)
        entree = self.derniere()
        self.assertEqual(entree.operation, Operation.CONNEXION_REUSSIE)
        self.assertEqual(entree.categorie, JournalActivite.Categorie.SECURITE)
        self.assertEqual(entree.cible, self.user)
        self.assertEqual(entree.cible_username, 'sc')
        self.assertEqual(entree.adresse_ip, '127.0.0.1')
        self.assert_sans_secret(MOT_DE_PASSE, otp.code)

    def test_mauvais_mot_de_passe(self):
        self.etape1(password='Mauvais#2026')
        entree = self.derniere()
        self.assertEqual(entree.operation, Operation.ECHEC_MOT_DE_PASSE)
        self.assertEqual(entree.cible, self.user)
        self.assertTrue(entree.details['compte_existant'])
        self.assert_sans_secret('Mauvais#2026')

    def test_identifiant_inconnu_non_enregistre(self):
        # Un mot de passe tapé dans le champ identifiant ne doit pas finir dans le journal
        self.etape1(username='Mon-secret#99')
        entree = self.derniere()
        self.assertEqual(entree.operation, Operation.ECHEC_MOT_DE_PASSE)
        self.assertIsNone(entree.cible)
        self.assertEqual(entree.cible_username, '')
        self.assertFalse(entree.details['compte_existant'])
        self.assert_sans_secret('Mon-secret#99', MOT_DE_PASSE)

    def test_compte_desactive(self):
        Utilisateur.objects.filter(pk=self.user.pk).update(is_active=False)
        r = self.etape1()
        self.assertEqual(r.status_code, 401)
        self.assertEqual(self.derniere().operation, Operation.CONNEXION_COMPTE_DESACTIVE)

    def test_compte_desactive_entre_les_deux_etapes(self):
        self.etape1()
        otp = self.otp()
        Utilisateur.objects.filter(pk=self.user.pk).update(is_active=False)
        self.etape2(otp.code)
        entree = self.derniere()
        self.assertEqual(entree.operation, Operation.CONNEXION_COMPTE_DESACTIVE)
        self.assertEqual(entree.details['etape'], 'code_verification')

    def test_code_refuse_puis_bloque(self):
        self.etape1()
        otp = self.otp()
        for _ in range(OTPCode.MAX_TENTATIVES - 1):
            self.etape2(self.code_faux(otp))
        echecs = JournalActivite.objects.filter(operation=Operation.ECHEC_OTP, cible=self.user)
        self.assertEqual(echecs.count(), OTPCode.MAX_TENTATIVES - 1)
        self.etape2(self.code_faux(otp))
        entree = self.derniere()
        self.assertEqual(entree.operation, Operation.OTP_BLOQUE)
        self.assertEqual(entree.details['tentatives'], OTPCode.MAX_TENTATIVES)
        self.assert_sans_secret(otp.code, self.code_faux(otp))

    def test_code_expire(self):
        self.etape1()
        otp = self.otp()
        OTPCode.objects.filter(pk=otp.pk).update(
            created_at=timezone.now() - timezone.timedelta(minutes=OTPCode.OTP_VALIDITY_MINUTES + 1)
        )
        self.etape2(otp.code)
        self.assertEqual(self.derniere().operation, Operation.OTP_EXPIRE)

    def test_code_pour_compte_inconnu(self):
        self.etape2('123456', username='inexistant')
        entree = self.derniere()
        self.assertEqual(entree.operation, Operation.ECHEC_OTP)
        self.assertEqual(entree.cible_username, '')


class JournalIntegriteTests(TestCase):
    def setUp(self):
        self.admin = Utilisateur.objects.create_user(username='admin', password='x', role=Utilisateur.Role.ADMIN_SYSTEME)
        self.cible = Utilisateur.objects.create_user(username='imp', password='x', role=Utilisateur.Role.IMPRIMEUR)

    def test_categorie_deduite_de_l_operation(self):
        e = journaliser(Operation.ROLE_MODIFIE, auteur=self.admin, cible=self.cible,
                        details={'ancien_role': 'IMPRIMEUR', 'nouveau_role': 'CHEF_SERVICE'})
        self.assertEqual(e.categorie, JournalActivite.Categorie.ADMINISTRATION)
        self.assertEqual(e.auteur_username, 'admin')
        self.assertEqual(e.details, {'ancien_role': 'IMPRIMEUR', 'nouveau_role': 'CHEF_SERVICE'})
        self.assertEqual(journaliser(Operation.ECHEC_OTP).categorie, JournalActivite.Categorie.SECURITE)

    def test_details_sensibles_ecartes(self):
        e = journaliser(Operation.COMPTE_MODIFIE, auteur=self.admin, cible=self.cible, details={
            'champs': ['email'], 'password': 'a', 'nouveau_mot_de_passe': 'b',
            'code_otp': 'c', 'token': 'd', 'refresh_jeton': 'e', 'SECRET_KEY': 'f',
        })
        self.assertEqual(e.details, {'champs': ['email']})

    def test_entree_ni_modifiable_ni_supprimable(self):
        e = journaliser(Operation.COMPTE_ACTIVE, auteur=self.admin, cible=self.cible)
        e.operation = Operation.COMPTE_DESACTIVE
        with self.assertRaises(ValueError):
            e.save()
        with self.assertRaises(ValueError):
            e.delete()
        e.refresh_from_db()
        self.assertEqual(e.operation, Operation.COMPTE_ACTIVE)

    def test_entree_conservee_si_compte_supprime(self):
        e = journaliser(Operation.COMPTE_DESACTIVE, auteur=self.admin, cible=self.cible)
        self.cible.delete()
        e.refresh_from_db()
        self.assertIsNone(e.cible)
        self.assertEqual(e.cible_username, 'imp')


class JournalApiTests(TestCase):
    URL = '/api/administration/journal/'

    def setUp(self):
        self.client = APIClient()
        self.admin = Utilisateur.objects.create_user(username='admin', password='x', role=Utilisateur.Role.ADMIN_SYSTEME)
        self.cible = Utilisateur.objects.create_user(username='imp', password='x', role=Utilisateur.Role.IMPRIMEUR)
        self.entree = journaliser(Operation.COMPTE_CREE, auteur=self.admin, cible=self.cible)
        journaliser(Operation.ECHEC_MOT_DE_PASSE, cible=self.cible)

    def test_admin_consulte_et_filtre(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 2)
        r = self.client.get(self.URL, {'categorie': 'ADMINISTRATION'})
        self.assertEqual([e['operation'] for e in r.data['results']], ['COMPTE_CREE'])
        self.assertEqual(r.data['results'][0]['operation_display'], 'Création de compte')
        r = self.client.get(self.URL, {'operation': 'ECHEC_MOT_DE_PASSE', 'utilisateur': 'imp'})
        self.assertEqual(r.data['count'], 1)
        r = self.client.get(self.URL, {'utilisateur': 'personne'})
        self.assertEqual(r.data['count'], 0)

    def test_journal_en_lecture_seule_meme_pour_admin(self):
        self.client.force_authenticate(self.admin)
        detail = f'{self.URL}{self.entree.pk}/'
        self.assertEqual(self.client.post(self.URL, {'operation': 'COMPTE_CREE'}).status_code, 405)
        self.assertEqual(self.client.patch(detail, {'operation': 'COMPTE_ACTIVE'}).status_code, 405)
        self.assertEqual(self.client.delete(detail).status_code, 405)
        self.assertEqual(JournalActivite.objects.count(), 2)

    def test_refus_pour_les_roles_metier_meme_superutilisateurs(self):
        for role in Utilisateur.ROLES_METIER:
            u = Utilisateur.objects.create_user(
                username=f'm-{role}', password='x', role=role, is_staff=True, is_superuser=True
            )
            self.client.force_authenticate(u)
            self.assertEqual(self.client.get(self.URL).status_code, 403, role)

    def test_refus_role_obsolete_admin_inactif_et_anonyme(self):
        obsolete = Utilisateur.objects.create_user(username='etu', password='x')
        Utilisateur.objects.filter(pk=obsolete.pk).update(role='ETUDIANT')
        obsolete.refresh_from_db()
        self.client.force_authenticate(obsolete)
        self.assertEqual(self.client.get(self.URL).status_code, 403)
        self.admin.is_active = False
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.URL).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.URL).status_code, 401)


class GestionComptesApiTests(TestCase):
    URL = '/api/administration/utilisateurs/'

    def setUp(self):
        from django.core import mail
        self.mail = mail
        self.client = APIClient()
        R = Utilisateur.Role
        self.admin = Utilisateur.objects.create_user(
            username='admin', password='x', email='admin@univ-toliara.mg', role=R.ADMIN_SYSTEME)
        self.imp = Utilisateur.objects.create_user(
            username='imp', password=MOT_DE_PASSE, email='imp@univ-toliara.mg', role=R.IMPRIMEUR,
            first_name='Hery', last_name='RABE')
        self.client.force_authenticate(self.admin)

    def detail(self, user, suffixe=''):
        return f'{self.URL}{user.pk}/{suffixe}'

    def creer(self, **donnees):
        valeurs = {'username': 'sc2', 'email': 'sc2@univ-toliara.mg', 'first_name': 'Lova',
                   'last_name': 'RASOA', 'role': 'SCOLARITE_CENTRALE'}
        valeurs.update(donnees)
        return self.client.post(self.URL, valeurs, format='json')

    def lien_du_dernier_mail(self):
        import re
        corps = self.mail.outbox[-1].body
        uid, jeton = re.search(r'/definir-mot-de-passe/([^/\s]+)/([^/\s]+)', corps).groups()
        return uid, jeton

    # ── Consultation et recherche ──────────────────────────────────────────
    def test_liste_sans_donnees_sensibles(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual({u['username'] for u in r.data}, {'admin', 'imp'})
        for champ in ('password', 'is_staff', 'is_superuser', 'groups', 'user_permissions'):
            self.assertNotIn(champ, r.data[0])

    def test_recherche_par_nom_identifiant_role_et_etat(self):
        self.assertEqual([u['username'] for u in self.client.get(self.URL, {'recherche': 'rabe'}).data], ['imp'])
        self.assertEqual([u['username'] for u in self.client.get(self.URL, {'recherche': 'adm'}).data], ['admin'])
        self.assertEqual([u['username'] for u in self.client.get(self.URL, {'role': 'IMPRIMEUR'}).data], ['imp'])
        Utilisateur.objects.filter(pk=self.imp.pk).update(is_active=False)
        self.assertEqual([u['username'] for u in self.client.get(self.URL, {'actif': 'false'}).data], ['imp'])

    def test_role_obsolete_signale(self):
        Utilisateur.objects.filter(pk=self.imp.pk).update(role='ETUDIANT')
        u = self.client.get(self.detail(self.imp)).data
        self.assertTrue(u['role_obsolete'])
        self.assertEqual(u['role_display'], 'Rôle obsolète (ETUDIANT)')

    # ── Création ───────────────────────────────────────────────────────────
    def test_creation_sans_mot_de_passe_connu_de_l_admin(self):
        r = self.creer(password='Impose#2026', is_superuser=True, is_staff=True)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data['lien_envoye'])
        self.assertFalse(r.data['mot_de_passe_defini'])
        u = Utilisateur.objects.get(username='sc2')
        self.assertFalse(u.has_usable_password())
        self.assertFalse(u.is_superuser)
        self.assertFalse(u.is_staff)
        self.assertTrue(u.is_active)
        self.assertEqual(u.role, 'SCOLARITE_CENTRALE')
        # Le lien part uniquement à l'utilisateur et n'apparaît ni dans la réponse ni dans le journal
        self.assertEqual(self.mail.outbox[-1].to, ['sc2@univ-toliara.mg'])
        uid, jeton = self.lien_du_dernier_mail()
        self.assertNotIn(jeton, json.dumps(r.data, default=str))
        entree = JournalActivite.objects.get(operation=Operation.COMPTE_CREE)
        self.assertEqual((entree.auteur, entree.cible), (self.admin, u))
        self.assertEqual(entree.details, {'role': 'SCOLARITE_CENTRALE'})
        self.assertNotIn(jeton, json.dumps(list(JournalActivite.objects.values()), default=str))

    def test_validation_des_donnees(self):
        self.assertEqual(self.creer(username='IMP').status_code, 400)               # identifiant déjà pris (casse)
        self.assertEqual(self.creer(email='IMP@univ-toliara.mg').status_code, 400)  # e-mail déjà pris
        self.assertEqual(self.creer(email='pas-un-email').status_code, 400)
        self.assertEqual(self.creer(username='avec espace').status_code, 400)
        self.assertEqual(self.creer(first_name='').status_code, 400)
        self.assertEqual(self.creer(role='INCONNU').status_code, 400)
        r = self.creer(role='SCOLARITE_ETABLISSEMENT')
        self.assertEqual(r.status_code, 400)
        self.assertIn('role', r.data)
        r = self.client.post(self.URL, {'username': 'x1', 'email': 'x1@univ-toliara.mg',
                                        'first_name': 'A', 'last_name': 'B'}, format='json')
        self.assertEqual(r.status_code, 400)
        # (MariaDB compare sans tenir compte de la casse : on compte les « imp »)
        self.assertEqual(Utilisateur.objects.filter(username__iexact='imp').count(), 1)
        self.assertFalse(Utilisateur.objects.filter(username__in=['sc2', 'x1', 'avec espace']).exists())
        self.assertFalse(JournalActivite.objects.filter(operation=Operation.COMPTE_CREE).exists())

    def test_creation_d_un_autre_administrateur(self):
        r = self.creer(username='admin2', email='a2@univ-toliara.mg', role='ADMIN_SYSTEME')
        self.assertEqual(r.status_code, 201)

    def test_lien_puis_connexion_2fa_du_nouveau_compte(self):
        self.creer()
        uid, jeton = self.lien_du_dernier_mail()
        self.client.force_authenticate(None)
        url = '/api/auth/definir-mot-de-passe/'
        verif = self.client.post(url, {'uid': uid, 'token': jeton})
        self.assertEqual(verif.data, {'valide': True, 'username': 'sc2'})
        r = self.client.post(url, {'uid': uid, 'token': jeton, 'mot_de_passe': '12345678', 'confirmation': '12345678'})
        self.assertEqual(r.status_code, 400)
        r = self.client.post(url, {'uid': uid, 'token': jeton, 'mot_de_passe': 'Vintsy-Ravo#26', 'confirmation': 'Autre#2026'})
        self.assertEqual(r.status_code, 400)
        r = self.client.post(url, {'uid': uid, 'token': jeton, 'mot_de_passe': 'Vintsy-Ravo#26', 'confirmation': 'Vintsy-Ravo#26'})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(JournalActivite.objects.filter(operation=Operation.MOT_DE_PASSE_DEFINI).exists())
        # Usage unique
        r = self.client.post(url, {'uid': uid, 'token': jeton, 'mot_de_passe': 'Autre-Mot#2026', 'confirmation': 'Autre-Mot#2026'})
        self.assertEqual(r.status_code, 400)
        # Connexion 2FA avec le mot de passe choisi
        r = self.client.post('/api/auth/login/', {'username': 'sc2', 'password': 'Vintsy-Ravo#26'})
        self.assertEqual(r.status_code, 200)
        u = Utilisateur.objects.get(username='sc2')
        code = OTPCode.objects.filter(utilisateur=u, is_used=False).latest('created_at').code
        r = self.client.post('/api/auth/verify-otp/', {'username': 'sc2', 'code': code})
        self.assertEqual(r.status_code, 200)
        u.refresh_from_db()
        self.assertIsNotNone(u.last_login)
        self.assertNotIn('Vintsy-Ravo#26', json.dumps(list(JournalActivite.objects.values()), default=str))

    def test_lien_falsifie_refuse(self):
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        url = '/api/auth/definir-mot-de-passe/'
        mdp = {'mot_de_passe': 'Vintsy-Ravo#26', 'confirmation': 'Vintsy-Ravo#26'}
        self.assertEqual(self.client.post(url, {'uid': 'xx', 'token': 'faux', **mdp}).status_code, 400)
        uid = urlsafe_base64_encode(force_bytes(self.imp.pk))
        self.assertEqual(self.client.post(url, {'uid': uid, 'token': 'faux-jeton', **mdp}).status_code, 400)
        self.imp.refresh_from_db()
        self.assertTrue(self.imp.check_password(MOT_DE_PASSE))

    # ── Modification et rôles ──────────────────────────────────────────────
    def test_modification_et_changement_de_role_journalises(self):
        r = self.client.patch(self.detail(self.imp), {'role': 'CHEF_SERVICE', 'last_name': 'RABEARISON'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.imp.refresh_from_db()
        self.assertEqual((self.imp.role, self.imp.last_name), ('CHEF_SERVICE', 'RABEARISON'))
        role = JournalActivite.objects.get(operation=Operation.ROLE_MODIFIE)
        self.assertEqual(role.details, {'ancien_role': 'IMPRIMEUR', 'nouveau_role': 'CHEF_SERVICE'})
        modif = JournalActivite.objects.get(operation=Operation.COMPTE_MODIFIE)
        self.assertEqual(modif.details, {'champs': ['last_name']})

    def test_champs_proteges_non_modifiables(self):
        protege = {'is_superuser': True, 'is_staff': True, 'is_active': False, 'password': 'Pirate#2026'}
        r = self.client.patch(self.detail(self.imp), {'username': 'autre', **protege}, format='json')
        self.assertEqual(r.status_code, 400)  # changement d'identifiant refusé
        r = self.client.patch(self.detail(self.imp), protege, format='json')
        self.assertEqual(r.status_code, 200)
        self.imp.refresh_from_db()
        self.assertEqual(self.imp.username, 'imp')
        self.assertFalse(self.imp.is_superuser)
        self.assertFalse(self.imp.is_staff)
        self.assertTrue(self.imp.is_active)
        self.assertTrue(self.imp.check_password(MOT_DE_PASSE))
        self.assertFalse(JournalActivite.objects.filter(operation=Operation.COMPTE_MODIFIE).exists())

    def test_attribution_scolarite_etablissement_refusee_mais_conservable(self):
        r = self.client.patch(self.detail(self.imp), {'role': 'SCOLARITE_ETABLISSEMENT'}, format='json')
        self.assertEqual(r.status_code, 400)
        etab = Utilisateur.objects.create_user(username='etab', password='x', email='e@univ-toliara.mg',
                                               role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT)
        r = self.client.patch(self.detail(etab), {'role': 'SCOLARITE_ETABLISSEMENT', 'first_name': 'Nirina'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_role_obsolete_peut_etre_regularise(self):
        Utilisateur.objects.filter(pk=self.imp.pk).update(role='ETUDIANT')
        r = self.client.patch(self.detail(self.imp), {'role': 'IMPRIMEUR'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_admin_ne_peut_pas_changer_son_propre_role(self):
        r = self.client.patch(self.detail(self.admin), {'role': 'PRESIDENCE'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, Utilisateur.Role.ADMIN_SYSTEME)

    def test_pas_de_suppression(self):
        self.assertEqual(self.client.delete(self.detail(self.imp)).status_code, 405)
        self.assertEqual(self.client.put(self.detail(self.imp), {}).status_code, 405)
        self.assertTrue(Utilisateur.objects.filter(pk=self.imp.pk).exists())

    # ── Activation / désactivation ─────────────────────────────────────────
    def test_desactivation_puis_activation(self):
        self.client.force_authenticate(None)
        self.client.post('/api/auth/login/', {'username': 'imp', 'password': MOT_DE_PASSE})
        self.client.force_authenticate(self.admin)
        r = self.client.post(self.detail(self.imp, 'desactiver/'))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['is_active'])
        self.assertFalse(OTPCode.objects.filter(utilisateur=self.imp, is_used=False).exists())
        self.assertEqual(self.client.post(self.detail(self.imp, 'desactiver/')).status_code, 409)
        # Le compte désactivé ne peut plus se connecter
        self.client.force_authenticate(None)
        r = self.client.post('/api/auth/login/', {'username': 'imp', 'password': MOT_DE_PASSE})
        self.assertEqual(r.status_code, 401)
        self.client.force_authenticate(self.admin)
        r = self.client.post(self.detail(self.imp, 'activer/'))
        self.assertTrue(r.data['is_active'])
        self.assertEqual(self.client.post(self.detail(self.imp, 'activer/')).status_code, 409)
        ops = list(JournalActivite.objects.filter(categorie='ADMINISTRATION').values_list('operation', flat=True))
        self.assertEqual(ops, [Operation.COMPTE_ACTIVE, Operation.COMPTE_DESACTIVE])

    def test_jeton_d_un_compte_desactive_refuse(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        acces = str(RefreshToken.for_user(self.imp).access_token)
        self.client.post(self.detail(self.imp, 'desactiver/'))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {acces}')
        self.assertEqual(client.get('/api/utilisateurs/me/').status_code, 401)

    def test_admin_ne_peut_pas_se_desactiver(self):
        r = self.client.post(self.detail(self.admin, 'desactiver/'))
        self.assertEqual(r.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    # ── Réinitialisation ───────────────────────────────────────────────────
    def test_reinitialisation_invalide_l_ancien_mot_de_passe(self):
        r = self.client.post(self.detail(self.imp, 'reinitialiser_acces/'))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['lien_envoye'])
        self.imp.refresh_from_db()
        self.assertFalse(self.imp.check_password(MOT_DE_PASSE))
        self.assertEqual(self.mail.outbox[-1].to, ['imp@univ-toliara.mg'])
        entree = JournalActivite.objects.get(operation=Operation.REINITIALISATION_DEMANDEE)
        self.assertEqual((entree.auteur, entree.cible), (self.admin, self.imp))
        uid, jeton = self.lien_du_dernier_mail()
        self.client.force_authenticate(None)
        r = self.client.post('/api/auth/definir-mot-de-passe/', {
            'uid': uid, 'token': jeton, 'mot_de_passe': 'Nouveau-Mot#26', 'confirmation': 'Nouveau-Mot#26'})
        self.assertEqual(r.status_code, 200)
        self.imp.refresh_from_db()
        self.assertTrue(self.imp.check_password('Nouveau-Mot#26'))

    def test_reinitialisation_refusee_compte_inactif_ou_sans_email(self):
        Utilisateur.objects.filter(pk=self.imp.pk).update(is_active=False)
        self.assertEqual(self.client.post(self.detail(self.imp, 'reinitialiser_acces/')).status_code, 409)
        Utilisateur.objects.filter(pk=self.imp.pk).update(is_active=True, email='')
        self.assertEqual(self.client.post(self.detail(self.imp, 'reinitialiser_acces/')).status_code, 400)
        self.imp.refresh_from_db()
        self.assertTrue(self.imp.check_password(MOT_DE_PASSE))
        self.assertEqual(self.client.post(self.detail(self.admin, 'reinitialiser_acces/')).status_code, 400)


class TableauDeBordAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        R = Utilisateur.Role
        self.admin = Utilisateur.objects.create_user(username='admin', password='x', email='a@u.mg', role=R.ADMIN_SYSTEME)
        Utilisateur.objects.create_user(username='sc', password='x', email='s@u.mg', role=R.SCOLARITE_CENTRALE)
        Utilisateur.objects.create_user(username='sc2', password='x', email='s2@u.mg', role=R.SCOLARITE_CENTRALE, is_active=False)
        etu = Utilisateur.objects.create_user(username='etu', password='x', email='')
        Utilisateur.objects.filter(pk=etu.pk).update(role='ETUDIANT')
        self.client.force_authenticate(self.admin)

    def test_indicateurs_reels(self):
        r = self.client.get('/api/administration/stats/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.data['total'], r.data['actifs'], r.data['inactifs']), (4, 3, 1))
        par_role = {ligne['role']: ligne for ligne in r.data['par_role']}
        self.assertEqual((par_role['SCOLARITE_CENTRALE']['total'], par_role['SCOLARITE_CENTRALE']['actifs']), (2, 1))
        self.assertTrue(par_role['ETUDIANT']['obsolete'])
        codes = {a['code'] for a in r.data['alertes']}
        self.assertTrue({'ADMIN_UNIQUE', 'ROLES_OBSOLETES', 'SANS_EMAIL'} <= codes)
        self.assertNotIn('SUPERUTILISATEURS', codes)

    def test_alerte_echecs_repetes(self):
        cible = Utilisateur.objects.get(username='sc')
        for _ in range(5):
            journaliser(Operation.ECHEC_OTP, cible=cible)
        r = self.client.get('/api/administration/stats/')
        self.assertIn('ECHECS_REPETES', {a['code'] for a in r.data['alertes']})
        self.assertEqual(r.data['echecs_connexion_24h'], 5)

    def test_referentiel_des_roles(self):
        roles = {r['code']: r for r in self.client.get('/api/administration/roles/').data}
        self.assertIn('Apposer signature présidentielle', roles['PRESIDENCE']['actions'])
        self.assertNotIn('Apposer signature présidentielle', roles['CHEF_SERVICE']['actions'])
        self.assertFalse(roles['ADMIN_SYSTEME']['acces_demandes'])
        self.assertFalse(roles['SCOLARITE_ETABLISSEMENT']['attribuable'])
        self.assertEqual(roles['SCOLARITE_CENTRALE']['total'], 2)

    def test_parametres_securite_sans_secret(self):
        from django.conf import settings
        r = self.client.get('/api/administration/securite/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['authentification']['otp_tentatives_max'], OTPCode.MAX_TENTATIVES)
        contenu = json.dumps(r.data, default=str)
        self.assertNotIn(settings.SECRET_KEY, contenu)
        if settings.EMAIL_HOST_PASSWORD:
            self.assertNotIn(settings.EMAIL_HOST_PASSWORD, contenu)


class IsolationApiAdministrationTests(TestCase):
    """Aucun endpoint d'administration n'est accessible hors du rôle ADMIN_SYSTEME."""

    def setUp(self):
        self.client = APIClient()
        self.cible = Utilisateur.objects.create_user(username='cible', password='x', role=Utilisateur.Role.IMPRIMEUR)

    def verifier_refus(self, user, attendu):
        self.client.force_authenticate(user)
        base = '/api/administration/'
        endpoints = [
            ('get', base + 'utilisateurs/'),
            ('post', base + 'utilisateurs/'),
            ('get', base + 'stats/'),
            ('get', base + 'roles/'),
            ('get', base + 'securite/'),
            ('get', base + 'journal/'),
            ('patch', f'{base}utilisateurs/{self.cible.pk}/'),
            ('post', f'{base}utilisateurs/{self.cible.pk}/desactiver/'),
            ('post', f'{base}utilisateurs/{self.cible.pk}/reinitialiser_acces/'),
        ]
        for methode, url in endpoints:
            r = getattr(self.client, methode)(url, {'role': 'ADMIN_SYSTEME', 'username': 'pirate'}, format='json')
            self.assertEqual(r.status_code, attendu, f'{methode} {url} ({getattr(user, "role", None)})')
        self.cible.refresh_from_db()
        self.assertTrue(self.cible.is_active)
        self.assertEqual(self.cible.role, Utilisateur.Role.IMPRIMEUR)
        self.assertFalse(Utilisateur.objects.filter(username='pirate').exists())

    def test_roles_metier_refuses_meme_superutilisateurs(self):
        for role in Utilisateur.ROLES_METIER:
            u = Utilisateur.objects.create_user(username=f'm-{role}', password='x', role=role,
                                                is_staff=True, is_superuser=True)
            self.verifier_refus(u, 403)

    def test_role_obsolete_et_anonyme_refuses(self):
        obsolete = Utilisateur.objects.create_user(username='etu', password='x')
        Utilisateur.objects.filter(pk=obsolete.pk).update(role='ETUDIANT')
        obsolete.refresh_from_db()
        self.verifier_refus(obsolete, 403)
        self.verifier_refus(None, 401)


class AdressesEquipesApiTests(TestCase):
    URL = '/api/administration/equipes/'

    def setUp(self):
        from django.core import mail
        self.mail = mail
        self.client = APIClient()
        self.admin = Utilisateur.objects.create_user(
            username='admin', password='x', email='admin@univ-toliara.mg', role=Utilisateur.Role.ADMIN_SYSTEME)
        Utilisateur.objects.create_user(username='chef', password='x', email='chef@univ-toliara.mg',
                                        role=Utilisateur.Role.CHEF_SERVICE)
        self.client.force_authenticate(self.admin)

    def definir(self, role='CHEF_SERVICE', **donnees):
        valeurs = {'email': 'diplomes@univ-toliara.mg', 'actif': True}
        valeurs.update(donnees)
        return self.client.put(f'{self.URL}{role}/', valeurs, format='json')

    def test_liste_des_cinq_equipes_metier(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual([e['role'] for e in r.data],
                         ['SCOLARITE_CENTRALE', 'CHEF_SERVICE', 'IMPRIMEUR', 'AGENT_TRANSMISSION', 'PRESIDENCE'])
        chef = r.data[1]
        self.assertFalse(chef['configuree'])
        self.assertEqual(chef['membres_actifs'], 1)

    def test_definition_puis_modification_journalisees(self):
        r = self.definir(email='Diplomes@Univ-Toliara.mg')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data['email'], r.data['actif'], r.data['modifie_par']),
                         ('diplomes@univ-toliara.mg', True, 'admin'))
        self.definir(actif=False)
        self.definir(actif=False)  # sans changement : pas de nouvelle entrée
        entrees = JournalActivite.objects.filter(operation=Operation.ADRESSE_EQUIPE_MODIFIEE).order_by('id')
        self.assertEqual(entrees.count(), 2)
        self.assertEqual(entrees[0].categorie, JournalActivite.Categorie.ADMINISTRATION)
        self.assertEqual(entrees[0].details['ancienne_adresse'], None)
        self.assertEqual(entrees[1].details['envoi_active'], False)

    def test_validation(self):
        self.assertEqual(self.definir(email='pas-une-adresse').status_code, 400)
        self.assertEqual(self.definir(role='ADMIN_SYSTEME').status_code, 404)
        self.assertEqual(self.definir(role='SCOLARITE_ETABLISSEMENT').status_code, 404)
        self.assertEqual(self.definir(role='INCONNU').status_code, 404)
        # Une adresse de compte personnel ne peut pas servir de boîte d'équipe
        r = self.definir(email='CHEF@univ-toliara.mg')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(AdresseNotificationEquipe.objects.exists())

    def test_compte_personnel_refuse_une_adresse_d_equipe(self):
        self.definir()
        r = self.client.post('/api/administration/utilisateurs/', {
            'username': 'chef2', 'email': 'diplomes@univ-toliara.mg', 'first_name': 'A',
            'last_name': 'B', 'role': 'CHEF_SERVICE'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)

    def test_message_de_test(self):
        self.assertEqual(self.client.post(f'{self.URL}CHEF_SERVICE/tester/').status_code, 404)
        self.definir()
        r = self.client.post(f'{self.URL}CHEF_SERVICE/tester/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.mail.outbox[-1].to, ['diplomes@univ-toliara.mg'])

    def test_echec_du_message_de_test_signale(self):
        from smtplib import SMTPException
        from unittest import mock
        self.definir()
        with mock.patch('administration.services.send_mail', side_effect=SMTPException('refus')):
            r = self.client.post(f'{self.URL}CHEF_SERVICE/tester/')
        self.assertEqual(r.status_code, 502)
        self.assertTrue(JournalActivite.objects.filter(operation=Operation.NOTIFICATION_EMAIL_ECHEC).exists())

    def test_reserve_a_l_administrateur(self):
        for role in Utilisateur.ROLES_METIER:
            u = Utilisateur.objects.create_user(username=f'm-{role}', password='x', role=role,
                                                is_staff=True, is_superuser=True)
            self.client.force_authenticate(u)
            self.assertEqual(self.client.get(self.URL).status_code, 403)
            self.assertEqual(self.definir().status_code, 403)
            self.assertEqual(self.client.post(f'{self.URL}CHEF_SERVICE/tester/').status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.URL).status_code, 401)
        self.assertFalse(AdresseNotificationEquipe.objects.exists())


class NotificationsEquipesCircuitTests(TestCase):
    """Les notifications d'équipe déjà émises par le circuit partent aussi à l'adresse de l'équipe."""

    def setUp(self):
        from datetime import date
        from django.core import mail
        from demandes.models import DemandeDiplome
        from .models import AdresseNotificationEquipe as Adresse

        self.mail = mail
        self.DemandeDiplome = DemandeDiplome
        self.client = APIClient()
        R = Utilisateur.Role
        self.scolarite = Utilisateur.objects.create_user(username='sc', password='x', role=R.SCOLARITE_CENTRALE)
        self.chef = Utilisateur.objects.create_user(username='chef', password='x', role=R.CHEF_SERVICE)
        self.imp = Utilisateur.objects.create_user(username='imp', password='x', role=R.IMPRIMEUR)
        from utilisateurs.models import Etudiant
        etudiant = Etudiant.objects.create(
            matricule='EQ-001', nom='RAKOTO', prenom='Jean', cin='EQ-CIN-001',
            date_naissance=date(2000, 1, 1), faculte='Faculté de test',
            filiere='Informatique', niveau_etude='Master 2',
        )
        self.demande = DemandeDiplome.objects.create(
            etudiant=etudiant, type_diplome='Master', statut=DemandeDiplome.Statut.VALIDEE)
        self.adresse_chef = Adresse.objects.create(role='CHEF_SERVICE', email='chef-equipe@univ-toliara.mg')
        Adresse.objects.create(role='IMPRIMEUR', email='impression@univ-toliara.mg')

    def action(self, user, action, **donnees):
        self.client.force_authenticate(user)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f'/api/demandes/{self.demande.pk}/passer_etape/',
                                    {'action': action, **donnees}, format='json')

    def test_notification_d_equipe_envoyee_a_l_adresse_configuree(self):
        r = self.action(self.scolarite, 'TRANSMETTRE_CHEF')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(self.mail.outbox), 1)
        message = self.mail.outbox[0]
        self.assertEqual(message.to, ['chef-equipe@univ-toliara.mg'])
        self.assertIn('Nouveau dossier transmis', message.subject)
        # La notification interne de chaque agent est inchangée
        self.assertEqual(self.chef.notifications.count(), 1)

    def test_adresse_desactivee_aucun_envoi(self):
        self.adresse_chef.actif = False
        self.adresse_chef.save()
        self.assertEqual(self.action(self.scolarite, 'TRANSMETTRE_CHEF').status_code, 200)
        self.assertEqual(len(self.mail.outbox), 0)

    def test_notification_individuelle_non_copiee_a_l_equipe(self):
        self.action(self.scolarite, 'TRANSMETTRE_CHEF')
        self.mail.outbox.clear()
        self.action(self.chef, 'PRENDRE_EN_CHARGE')
        r = self.action(self.chef, 'AFFECTER_IMPRIMEUR', imprimeur_id=self.imp.pk)
        self.assertEqual(r.status_code, 200)
        # Affectation nominative : notification à l'imprimeur désigné, pas à la boîte d'équipe
        self.assertEqual([m.to for m in self.mail.outbox], [])
        self.assertEqual(self.imp.notifications.count(), 1)

    def test_echec_d_envoi_ne_bloque_pas_le_circuit(self):
        from smtplib import SMTPException
        from unittest import mock
        with mock.patch('administration.services.send_mail', side_effect=SMTPException('refus')):
            r = self.action(self.scolarite, 'TRANSMETTRE_CHEF')
        self.assertEqual(r.status_code, 200)
        self.demande.refresh_from_db()
        self.assertIsNotNone(self.demande.date_transmission_chef)
        entree = JournalActivite.objects.get(operation=Operation.NOTIFICATION_EMAIL_ECHEC)
        self.assertEqual(entree.categorie, JournalActivite.Categorie.TECHNIQUE)
        self.assertEqual(entree.details['equipe'], 'CHEF_SERVICE')

    def test_etape_refusee_n_envoie_rien(self):
        r = self.action(self.scolarite, 'VALIDER_SCOLARITE_CENTRALE')  # déjà validée
        self.assertEqual(r.status_code, 409)
        self.assertEqual(len(self.mail.outbox), 0)


class MessagesEnFrancaisTests(TestCase):
    """Règles et erreurs de mot de passe affichées en français (LANGUAGE_CODE reste inchangé)."""

    def test_regles_et_erreurs_de_mot_de_passe_en_francais(self):
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.contrib.auth.tokens import default_token_generator

        admin = Utilisateur.objects.create_user(username='admin', password='x', role=Utilisateur.Role.ADMIN_SYSTEME)
        client = APIClient()
        client.force_authenticate(admin)
        regles = ' '.join(client.get('/api/administration/securite/').data['mots_de_passe']['validateurs'])
        self.assertIn('caractères', regles)

        imp = Utilisateur.objects.create_user(username='imp', password='x', role=Utilisateur.Role.IMPRIMEUR)
        client.force_authenticate(None)
        r = client.post('/api/auth/definir-mot-de-passe/', {
            'uid': urlsafe_base64_encode(force_bytes(imp.pk)), 'token': default_token_generator.make_token(imp),
            'mot_de_passe': '123', 'confirmation': '123'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('mot de passe', ' '.join(r.data['mot_de_passe']).lower())
