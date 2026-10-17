import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from utilisateurs.models import Utilisateur, Etudiant
from demandes.models import DemandeDiplome, Historique
from diplomes.models import Diplome

Statut = DemandeDiplome.Statut

def populate():
    print("--- Population des utilisateurs (6 rôles) et données de test (Université de Toliara) ---")

    # 1. Scolarité Établissement (Faculté des Sciences)
    u_scol_sci, created = Utilisateur.objects.get_or_create(
        username='scol_sciences',
        defaults={
            'email': 'scol.sciences@univ-toliara.mg',
            'first_name': 'Aina',
            'last_name': 'Raveloson',
            'role': Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
            'etablissement': 'Faculté des Sciences'
        }
    )
    u_scol_sci.role = Utilisateur.Role.SCOLARITE_ETABLISSEMENT
    u_scol_sci.etablissement = 'Faculté des Sciences'
    if created:
        u_scol_sci.set_password('Sciences-Toliara#26!')
    u_scol_sci.save()

    # 2. Scolarité Établissement (Faculté des Lettres - FLSH)
    u_scol_lettres, created = Utilisateur.objects.get_or_create(
        username='scol_lettres',
        defaults={
            'email': 'scol.lettres@univ-toliara.mg',
            'first_name': 'Noro',
            'last_name': 'Razafindrakoto',
            'role': Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
            'etablissement': 'Faculté des Lettres et Sciences Humaines (FLSH)'
        }
    )
    u_scol_lettres.role = Utilisateur.Role.SCOLARITE_ETABLISSEMENT
    u_scol_lettres.etablissement = 'Faculté des Lettres et Sciences Humaines (FLSH)'
    if created:
        u_scol_lettres.set_password('Lettres-Toliara#26!')
    u_scol_lettres.save()

    # 3. Scolarité Centrale
    u_scol_centrale, created = Utilisateur.objects.get_or_create(
        username='scolarite1',
        defaults={
            'email': 'scolarite1@univ-toliara.mg',
            'first_name': 'Agent',
            'last_name': 'Centrale',
            'role': Utilisateur.Role.SCOLARITE_CENTRALE
        }
    )
    u_scol_centrale.role = Utilisateur.Role.SCOLARITE_CENTRALE
    if created:
        u_scol_centrale.set_password('Scolarite-Centrale#26!')
    u_scol_centrale.save()

    # 4. Chef de Service des Diplômes
    u_chef, created = Utilisateur.objects.get_or_create(
        username='chef1',
        defaults={
            'email': 'chef1@univ-toliara.mg',
            'first_name': 'Hery',
            'last_name': 'Rasoanaivo',
            'role': Utilisateur.Role.CHEF_SERVICE
        }
    )
    u_chef.role = Utilisateur.Role.CHEF_SERVICE
    if created:
        u_chef.set_password('Chef-Diplomes#26!')
    u_chef.save()

    # 5. Concepteur / Imprimeur
    u_imp, created = Utilisateur.objects.get_or_create(
        username='imprimeur1',
        defaults={
            'email': 'imprimeur1@univ-toliara.mg',
            'first_name': 'Jean',
            'last_name': 'Rakoto',
            'role': Utilisateur.Role.IMPRIMEUR
        }
    )
    u_imp.role = Utilisateur.Role.IMPRIMEUR
    if created:
        u_imp.set_password('Concepteur-Imprimeur#26!')
    u_imp.save()

    # 6. Agent de Transmission
    u_trans, created = Utilisateur.objects.get_or_create(
        username='agent_trans1',
        defaults={
            'email': 'transmission1@univ-toliara.mg',
            'first_name': 'Faly',
            'last_name': 'Andriatsitohaina',
            'role': Utilisateur.Role.AGENT_TRANSMISSION
        }
    )
    u_trans.role = Utilisateur.Role.AGENT_TRANSMISSION
    if created:
        u_trans.set_password('Agent-Transmission#26!')
    u_trans.save()

    # 7. Présidence
    u_pres, created = Utilisateur.objects.get_or_create(
        username='presidence1',
        defaults={
            'email': 'presidence1@univ-toliara.mg',
            'first_name': 'Prof.',
            'last_name': 'Andriamanantena',
            'role': Utilisateur.Role.PRESIDENCE
        }
    )
    u_pres.role = Utilisateur.Role.PRESIDENCE
    if created:
        u_pres.set_password('President-Toliara#26!')
    u_pres.save()

    # Données Étudiants et Demandes à différentes étapes du processus réel
    etudiants_data = [
        {
            'matricule': 'TUL-2026-001',
            'nom': 'RANDRIA',
            'prenom': 'Tojo',
            'date_naissance': '2001-04-12',
            'cin': '501011234567',
            'faculte': 'Faculté des Sciences',
            'filiere': 'Mathématiques et Informatique',
            'niveau_etude': 'Master 2',
            'type_diplome': 'Diplôme de Master en Informatique',
            'statut_init': Statut.EN_ATTENTE_VERIFICATION,
            'obs': 'Dossier complet remis au guichet de la scolarité des Sciences.',
            'creator': u_scol_sci
        },
        {
            'matricule': 'TUL-2026-002',
            'nom': 'RASOA',
            'prenom': 'Fitia',
            'date_naissance': '2002-08-25',
            'cin': '501011234568',
            'faculte': 'Faculté de Droit, Économie, Gestion et Sociologie (FDEGS)',
            'filiere': 'Gestion et Management',
            'niveau_etude': 'Licence 3',
            'type_diplome': 'Diplôme de Licence en Gestion',
            'statut_init': Statut.DOSSIER_INCOMPLET,
            'obs': 'Reçu de paiement illisible. Attente de la nouvelle quittance bancaire.',
            'creator': u_scol_centrale
        },
        {
            'matricule': 'TUL-2026-003',
            'nom': 'RAKOTOMALALA',
            'prenom': 'Tahina',
            'date_naissance': '2000-11-05',
            'cin': '501011234569',
            'faculte': 'Faculté des Lettres et Sciences Humaines (FLSH)',
            'filiere': 'Études Françaises et Francophones',
            'niveau_etude': 'Master 2',
            'type_diplome': 'Diplôme de Master en Lettres',
            'statut_init': Statut.VALIDEE,
            'obs': 'Admission et conformité académique certifiées par Scolarité Centrale.',
            'creator': u_scol_lettres
        },
        {
            'matricule': 'TUL-2026-004',
            'nom': 'ANDRIANINA',
            'prenom': 'Vohangy',
            'date_naissance': '1999-02-18',
            'cin': '501011234570',
            'faculte': 'Faculté des Sciences',
            'filiere': 'Physique et Applications',
            'niveau_etude': 'Master 2',
            'type_diplome': 'Diplôme de Master en Physique',
            'statut_init': Statut.EN_ATTENTE_IMPRESSION,
            'obs': 'Affecté à imprimeur1 pour tirage sécurisé.',
            'creator': u_chef,
            'imprimeur': u_imp
        },
        {
            'matricule': 'TUL-2026-005',
            'nom': 'RAZAFY',
            'prenom': 'Solofo',
            'date_naissance': '1998-07-30',
            'cin': '501011234571',
            'faculte': 'Faculté de Médecine et Pharmacie',
            'filiere': 'Médecine Générale',
            'niveau_etude': 'Doctorat',
            'type_diplome': 'Diplôme d\'État de Docteur en Médecine',
            'statut_init': Statut.IMPRIME,
            'obs': 'Diplôme imprimé et prêt à être confié à un agent de transmission.',
            'creator': u_chef
        },
        {
            'matricule': 'TUL-2026-006',
            'nom': 'MANANA',
            'prenom': 'Bao',
            'date_naissance': '2001-09-14',
            'cin': '501011234572',
            'faculte': 'Faculté des Sciences',
            'filiere': 'Sciences de la Vie et de l\'Environnement',
            'niveau_etude': 'Licence 3',
            'type_diplome': 'Diplôme de Licence en Sciences Naturelles',
            'statut_init': Statut.EN_TRANSMISSION_PRESIDENT,
            'obs': 'Confié à un agent de transmission pour acheminement à la Présidence.',
            'creator': u_chef,
            'agent_trans': u_trans
        },
        {
            'matricule': 'TUL-2026-007',
            'nom': 'HERINIRINA',
            'prenom': 'Dina',
            'date_naissance': '2000-03-21',
            'cin': '501011234573',
            'faculte': 'Institut Halieutique et des Sciences Marines (IH.SM)',
            'filiere': 'Sciences Marines et Halieutiques (Océanographie)',
            'niveau_etude': 'Master 2',
            'type_diplome': 'Diplôme de Master en Sciences Marines',
            'statut_init': Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
            'obs': 'Déposé au secrétariat de la Présidence pour signature.',
            'creator': u_trans
        },
        {
            'matricule': 'TUL-2026-008',
            'nom': 'VELO',
            'prenom': 'Kanto',
            'date_naissance': '1999-12-08',
            'cin': '501011234574',
            'faculte': 'Faculté des Lettres et Sciences Humaines (FLSH)',
            'filiere': 'Histoire et Patrimoine',
            'niveau_etude': 'Licence 3',
            'type_diplome': 'Diplôme de Licence en Histoire',
            'statut_init': Statut.RETOUR_SCOLARITE,
            'obs': 'Signé par le Président et acheminé en retour au Chef de service.',
            'creator': u_scol_lettres
        }
    ]

    for data in etudiants_data:
        etudiant_obj, _ = Etudiant.objects.get_or_create(
            matricule=data['matricule'],
            defaults={
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
                'etablissement_origine': data['faculte'],
                'agent_responsable': data['creator'],
                'imprimeur_assigne': data.get('imprimeur'),
                'agent_transmission': data.get('agent_trans'),
                'has_pv_soutenance': True,
                'has_releve_notes': True,
                'has_certificat_scolarite': True,
                'has_recu_bancaire': True
            }
        )

        if data['statut_init'] in [
            Statut.IMPRIME,
            Statut.EN_TRANSMISSION_PRESIDENT,
            Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
            Statut.SIGNE_PRESIDENT,
            Statut.RETOUR_SCOLARITE,
        ]:
            demande.date_impression = timezone.now()
            Diplome.objects.get_or_create(
                demande=demande,
                defaults={
                    'numero_diplome': Diplome.generer_numero(timezone.now().year),
                    'code_verification': Diplome.generer_code_verification(),
                    'mention': 'Bien',
                    'date_delivrance': timezone.now().date() if data['statut_init'] in [Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE] else None
                }
            )

        Historique.objects.get_or_create(
            demande=demande,
            utilisateur=data['creator'],
            role_utilisateur=data['creator'].role,
            action_realisee=f"Dossier initialisé à l'état '{demande.get_statut_display()}'",
            ancien_statut=None,
            nouveau_statut=demande.statut,
            commentaire=data['obs']
        )

    print("SUCCESS: 7 Comptes Utilisateurs (6 Rôles) et Données de Test initialisés avec succès !")

if __name__ == '__main__':
    populate()
