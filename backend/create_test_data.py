import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from utilisateurs.models import Utilisateur, Etudiant
from demandes.models import DemandeDiplome, Historique
from diplomes.models import Diplome

def populate():
    print("--- Population des utilisateurs et données de test (Université de Toliara) ---")

    # 1. Chef de Service
    u_chef, _ = Utilisateur.objects.get_or_create(
        username='chef1',
        defaults={'email': 'chef1@univ-toliara.mg', 'first_name': 'Hery', 'last_name': 'Rasoanaivo', 'role': Utilisateur.Role.CHEF_SERVICE}
    )
    u_chef.role = Utilisateur.Role.CHEF_SERVICE
    u_chef.set_password('password123')
    u_chef.save()

    # 2. Scolarité Centrale
    u_scol, _ = Utilisateur.objects.get_or_create(
        username='scolarite1',
        defaults={'email': 'scolarite1@univ-toliara.mg', 'first_name': 'Mialy', 'last_name': 'Ralaivao', 'role': Utilisateur.Role.SCOLARITE_CENTRALE}
    )
    u_scol.role = Utilisateur.Role.SCOLARITE_CENTRALE
    u_scol.set_password('password123')
    u_scol.save()

    # 3. Imprimeur
    u_imp, _ = Utilisateur.objects.get_or_create(
        username='imprimeur1',
        defaults={'email': 'imprimeur1@univ-toliara.mg', 'first_name': 'Jean', 'last_name': 'Rakoto', 'role': Utilisateur.Role.IMPRIMEUR}
    )
    u_imp.role = Utilisateur.Role.IMPRIMEUR
    u_imp.set_password('password123')
    u_imp.save()

    # 4. Présidence
    u_pres, _ = Utilisateur.objects.get_or_create(
        username='presidence1',
        defaults={'email': 'presidence1@univ-toliara.mg', 'first_name': 'Prof.', 'last_name': 'Andriamanantena', 'role': Utilisateur.Role.PRESIDENCE}
    )
    u_pres.role = Utilisateur.Role.PRESIDENCE
    u_pres.set_password('password123')
    u_pres.save()

    # Données Étudiants de test
    etudiants_data = [
        {
            'username': 'etu_2026_01',
            'matricule': 'TUL-2026-001',
            'nom': 'RANDRIA',
            'prenom': 'Tojo',
            'date_naissance': '2001-04-12',
            'cin': '501011234567',
            'faculte': 'Sciences et Technologies',
            'filiere': 'Informatique et Télécommunications',
            'niveau_etude': 'Master 2',
            'type_diplome': 'Master en Informatique',
            'statut_init': DemandeDiplome.Statut.RECUE,
            'obs': 'Dossier transmis par le portail de candidature.'
        },
        {
            'username': 'etu_2026_02',
            'matricule': 'TUL-2026-002',
            'nom': 'RASOA',
            'prenom': 'Fitia',
            'date_naissance': '2002-08-25',
            'cin': '501011234568',
            'faculte': 'Droit, Économie et Gestion',
            'filiere': 'Gestion et Administration',
            'niveau_etude': 'Licence 3',
            'type_diplome': 'Licence en Gestion',
            'statut_init': DemandeDiplome.Statut.VERIFIEE_CHEF,
            'obs': 'Vérification initiale des relevés conforme.'
        },
        {
            'username': 'etu_2026_03',
            'matricule': 'TUL-2026-003',
            'nom': 'RAKOTOMALALA',
            'prenom': 'Tahina',
            'date_naissance': '2000-11-05',
            'cin': '501011234569',
            'faculte': 'Lettres et Sciences Humaines',
            'filiere': 'Études Françaises et Francophones',
            'niveau_etude': 'Master 2',
            'type_diplome': 'Master en Lettres',
            'statut_init': DemandeDiplome.Statut.SCOLARITE_PREPAREE,
            'obs': 'Validation académique et PV de soutenance confirmés.'
        },
        {
            'username': 'etu_2026_04',
            'matricule': 'TUL-2026-004',
            'nom': 'ANDRIANINA',
            'prenom': 'Vohangy',
            'date_naissance': '1999-02-18',
            'cin': '501011234570',
            'faculte': 'Sciences et Technologies',
            'filiere': 'Physique-Chimie',
            'niveau_etude': 'Licence 3',
            'type_diplome': 'Licence en Physique',
            'statut_init': DemandeDiplome.Statut.IMPRIMEE,
            'obs': 'Diplôme imprimé sur papier sécurisé, en attente du sceau Présidence.'
        },
        {
            'username': 'etu_2026_05',
            'matricule': 'TUL-2026-005',
            'nom': 'RAZAFY',
            'prenom': 'Solofo',
            'date_naissance': '1998-07-30',
            'cin': '501011234571',
            'faculte': 'Médecine et Pharmacie',
            'filiere': 'Médecine Générale',
            'niveau_etude': 'Doctorat',
            'type_diplome': 'Doctorat en Médecine',
            'statut_init': DemandeDiplome.Statut.DISPONIBLE,
            'obs': 'Signé par le Président et disponible au guichet.'
        }
    ]

    for data in etudiants_data:
        u_et, _ = Utilisateur.objects.get_or_create(
            username=data['username'],
            defaults={'email': f"{data['username']}@student.univ-toliara.mg", 'first_name': data['prenom'], 'last_name': data['nom'], 'role': Utilisateur.Role.ETUDIANT}
        )
        u_et.set_password('password123')
        u_et.save()

        etudiant_obj, _ = Etudiant.objects.get_or_create(
            utilisateur=u_et,
            defaults={
                'matricule': data['matricule'],
                'nom': data['nom'],
                'prenom': data['prenom'],
                'date_naissance': data['date_naissance'],
                'cin': data['cin'],
                'faculte': data['faculte'],
                'filiere': data['filiere'],
                'niveau_etude': data['niveau_etude']
            }
        )

        demande, created = DemandeDiplome.objects.get_or_create(
            etudiant=etudiant_obj,
            type_diplome=data['type_diplome'],
            defaults={
                'statut': data['statut_init'],
                'observations': data['obs'],
                'agent_responsable': u_chef
            }
        )
        if created and data['statut_init'] == DemandeDiplome.Statut.DISPONIBLE:
            demande.date_disponibilite = timezone.now()
            demande.date_signature = timezone.now()
            demande.date_impression = timezone.now()
            demande.save()
            Diplome.objects.get_or_create(
                demande=demande,
                defaults={
                    'numero_diplome': Diplome.generer_numero(demande.date_signature.year),
                    'code_verification': Diplome.generer_code_verification(),
                    'mention': 'Très Bien',
                    'date_delivrance': demande.date_signature.date(),
                }
            )

        Historique.objects.get_or_create(
            demande=demande,
            utilisateur=u_chef,
            action_realisee=f"Dossier initialisé à l'état '{demande.get_statut_display()}'"
        )

    print("SUCCESS: Donnees de test generees avec succes pour l'Universite de Toliara !")

if __name__ == '__main__':
    populate()
