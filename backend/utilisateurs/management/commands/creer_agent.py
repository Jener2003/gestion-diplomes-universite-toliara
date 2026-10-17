import getpass
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.utils import translation
from utilisateurs.models import Utilisateur

class Command(BaseCommand):
    help = "Crée ou met à jour un compte agent administratif avec un mot de passe personnalisé."

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help="Nom d'utilisateur / identifiant")
        parser.add_argument('--role', type=str, choices=['SCOLARITE_ETABLISSEMENT', 'SCOLARITE_CENTRALE', 'CHEF_SERVICE', 'IMPRIMEUR', 'AGENT_TRANSMISSION', 'PRESIDENCE', 'ADMIN_SYSTEME'], help="Rôle du compte")
        parser.add_argument('--email', type=str, help="Adresse email (pour le code 2FA)")
        parser.add_argument('--password', type=str, help="Mot de passe personnalisé")
        parser.add_argument('--nom', type=str, help="Nom de famille")
        parser.add_argument('--prenom', type=str, help="Prénom")
        parser.add_argument('--etablissement', type=str, help="Établissement associé au compte Scolarité d'établissement")

    def handle(self, *args, **options):
        # Messages des validateurs de mot de passe en français
        with translation.override('fr'):
            return self._handle(**options)

    def _handle(self, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Création / Mise à jour d'un Agent Administratif ==="))

        username = options.get('username')
        if not username:
            username = input("Identifiant (username) : ").strip()
            while not username:
                username = input("L'identifiant est obligatoire : ").strip()

        role = options.get('role')
        if not role:
            self.stdout.write("\nChoisissez le rôle :")
            self.stdout.write("1. SCOLARITE_ETABLISSEMENT (Scolarité d'établissement)")
            self.stdout.write("2. SCOLARITE_CENTRALE (Scolarité Centrale - Contrôle PV)")
            self.stdout.write("3. CHEF_SERVICE (Chef de Service des Diplômes)")
            self.stdout.write("4. IMPRIMEUR (Concepteur / Imprimeur des diplômes)")
            self.stdout.write("5. AGENT_TRANSMISSION (Acheminement des diplômes)")
            self.stdout.write("6. PRESIDENCE (Présidence - Signature & Sceau)")
            self.stdout.write("7. ADMIN_SYSTEME (Administrateur système - gestion des comptes)")

            choice = input("Votre choix (1/2/3/4/5/6/7) [1] : ").strip() or '1'
            role_map = {
                '1': Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
                '2': Utilisateur.Role.SCOLARITE_CENTRALE,
                '3': Utilisateur.Role.CHEF_SERVICE,
                '4': Utilisateur.Role.IMPRIMEUR,
                '5': Utilisateur.Role.AGENT_TRANSMISSION,
                '6': Utilisateur.Role.PRESIDENCE,
                '7': Utilisateur.Role.ADMIN_SYSTEME
            }
            role = role_map.get(choice, Utilisateur.Role.SCOLARITE_ETABLISSEMENT)

        email = options.get('email')
        if not email:
            email = input(f"Adresse email [{username}@univ-toliara.mg] : ").strip()
            if not email:
                email = f"{username}@univ-toliara.mg"

        prenom = options.get('prenom')
        if not prenom:
            prenom = input("Prénom [Agent] : ").strip() or "Agent"

        nom = options.get('nom')
        if not nom:
            nom = input(f"Nom [{username.upper()}] : ").strip() or username.upper()

        etablissement = options.get('etablissement')
        if role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT and not etablissement:
            etablissement = input("Établissement associé (faculté/service) : ").strip()

        # Validateurs Django (AUTH_PASSWORD_VALIDATORS), dont la ressemblance avec l'identité
        candidat = Utilisateur(username=username, email=email, first_name=prenom, last_name=nom)

        password = options.get('password')
        if password:
            try:
                validate_password(password, candidat)
            except ValidationError as e:
                raise CommandError("Mot de passe refusé : " + " ".join(e.messages))
        else:
            while True:
                password = getpass.getpass("Mot de passe personnalisé : ")
                if not password:
                    self.stdout.write(self.style.ERROR("Le mot de passe ne peut pas être vide."))
                    continue
                try:
                    validate_password(password, candidat)
                except ValidationError as e:
                    self.stdout.write(self.style.ERROR("Mot de passe refusé : " + " ".join(e.messages)))
                    continue
                confirm_pass = getpass.getpass("Confirmez le mot de passe : ")
                if password != confirm_pass:
                    self.stdout.write(self.style.ERROR("Les mots de passe ne correspondent pas. Réessayez."))
                else:
                    break

        user, created = Utilisateur.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': prenom,
                'last_name': nom,
                'role': role
            }
        )

        user.email = email
        user.first_name = prenom
        user.last_name = nom
        user.role = role
        user.etablissement = etablissement or None
        # L'administrateur système travaille dans l'application : pas d'accès à l'admin Django
        user.is_staff = role != Utilisateur.Role.ADMIN_SYSTEME
        user.set_password(password)
        user.save()

        action_str = "créé" if created else "mis à jour"
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Succès : L'utilisateur '{username}' ({user.get_role_display()}) a été {action_str} avec votre mot de passe personnalisé !"
        ))
