import getpass
from django.core.management.base import BaseCommand
from utilisateurs.models import Utilisateur

class Command(BaseCommand):
    help = "Crée ou met à jour un compte agent administratif avec un mot de passe personnalisé."

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help="Nom d'utilisateur / identifiant")
        parser.add_argument('--role', type=str, choices=['CHEF_SERVICE', 'SCOLARITE_CENTRALE', 'IMPRIMEUR', 'PRESIDENCE'], help="Rôle administratif")
        parser.add_argument('--email', type=str, help="Adresse email (pour le code 2FA)")
        parser.add_argument('--password', type=str, help="Mot de passe personnalisé")
        parser.add_argument('--nom', type=str, help="Nom de famille")
        parser.add_argument('--prenom', type=str, help="Prénom")

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Création / Mise à jour d'un Agent Administratif ==="))

        username = options.get('username')
        if not username:
            username = input("Identifiant (username) : ").strip()
            while not username:
                username = input("L'identifiant est obligatoire : ").strip()

        role = options.get('role')
        if not role:
            self.stdout.write("\nChoisissez le rôle :")
            self.stdout.write("1. CHEF_SERVICE (Chef de Service - Guichet)")
            self.stdout.write("2. SCOLARITE_CENTRALE (Scolarité Centrale - Contrôle PV)")
            self.stdout.write("3. IMPRIMEUR (Service Impression)")
            self.stdout.write("4. PRESIDENCE (Présidence - Signature & Sceau)")
            
            choice = input("Votre choix (1/2/3/4) [1] : ").strip() or '1'
            role_map = {
                '1': Utilisateur.Role.CHEF_SERVICE,
                '2': Utilisateur.Role.SCOLARITE_CENTRALE,
                '3': Utilisateur.Role.IMPRIMEUR,
                '4': Utilisateur.Role.PRESIDENCE
            }
            role = role_map.get(choice, Utilisateur.Role.CHEF_SERVICE)

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

        password = options.get('password')
        if not password:
            while True:
                password = getpass.getpass("Mot de passe personnalisé : ")
                if not password:
                    self.stdout.write(self.style.ERROR("Le mot de passe ne peut pas être vide."))
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
        user.is_staff = True
        user.set_password(password)
        user.save()

        action_str = "créé" if created else "mis à jour"
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Succès : L'utilisateur '{username}' ({user.get_role_display()}) a été {action_str} avec votre mot de passe personnalisé !"
        ))
