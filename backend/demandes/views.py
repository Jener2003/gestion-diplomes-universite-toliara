from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Count, Q

from .models import DemandeDiplome, Historique
from .serializers import DemandeDiplomeSerializer, HistoriqueSerializer
from notifications.models import Notification
from utilisateurs.models import Utilisateur, Etudiant

Statut = DemandeDiplome.Statut


def create_notification_for_role(role, titre, message, user_target=None):
    """Envoie une notification aux utilisateurs d'un rôle ou à un utilisateur spécifique."""
    if user_target:
        Notification.objects.create(
            utilisateur=user_target,
            titre=titre,
            message=message,
            type_notification='INFO'
        )
    else:
        users = Utilisateur.objects.filter(role=role, is_active=True)
        for u in users:
            Notification.objects.create(
                utilisateur=u,
                titre=titre,
                message=message,
                type_notification='INFO'
            )


# Matrice complète des transitions du circuit administratif réel à 9 étapes
TRANSITIONS_AUTORISEES = {
    # ── Étape 3 : Scolarité Centrale ──────────────────────────────────────────
    'VALIDER_SCOLARITE_CENTRALE': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE],
        'depuis': [Statut.EN_ATTENTE_VERIFICATION, Statut.DOSSIER_INCOMPLET],
        'nouveau_statut': Statut.VALIDEE,
        'label': 'Valider la conformité du dossier'
    },
    'MARQUER_INCOMPLET': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE],
        'depuis': [Statut.EN_ATTENTE_VERIFICATION],
        'nouveau_statut': Statut.DOSSIER_INCOMPLET,
        'label': 'Marquer dossier incomplet'
    },
    'REFUSER': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.EN_ATTENTE_VERIFICATION, Statut.DOSSIER_INCOMPLET, Statut.VALIDEE],
        'nouveau_statut': Statut.REFUSEE,
        'label': 'Refuser la demande'
    },
    'COMPLETER_DOSSIER': {
        'roles': [Utilisateur.Role.SCOLARITE_ETABLISSEMENT, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.DOSSIER_INCOMPLET],
        'nouveau_statut': Statut.EN_ATTENTE_VERIFICATION,
        'label': 'Compléter les pièces du dossier'
    },

    # ── Étape 4 : Chef de Service des Diplômes ─────────────────────────────────
    'PRENDRE_EN_CHARGE': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.VALIDEE],
        'nouveau_statut': Statut.EN_TRAITEMENT,
        'label': 'Prendre en charge le dossier'
    },
    'AFFECTER_IMPRIMEUR': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.VALIDEE, Statut.EN_TRAITEMENT],
        'nouveau_statut': Statut.EN_ATTENTE_IMPRESSION,
        'label': 'Affecter à un imprimeur'
    },

    # ── Étape 5 : Concepteur / Imprimeur ──────────────────────────────────────
    'LANCER_IMPRESSION': {
        'roles': [Utilisateur.Role.IMPRIMEUR],
        'depuis': [Statut.EN_ATTENTE_IMPRESSION],
        'nouveau_statut': Statut.EN_IMPRESSION,
        'label': 'Démarrer l\'impression'
    },
    'TERMINER_IMPRESSION': {
        'roles': [Utilisateur.Role.IMPRIMEUR],
        'depuis': [Statut.EN_IMPRESSION, Statut.EN_ATTENTE_IMPRESSION],
        'nouveau_statut': Statut.IMPRIME,
        'label': 'Déclarer impression terminée'
    },

    # ── Étape 6 : Signature Doyen / Directeur d'établissement ─────────────────
    'TRANSMETTRE_SIGNATURE_ETABLISSEMENT': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.IMPRIME],
        'nouveau_statut': Statut.EN_ATTENTE_SIGNATURE_ETABLISSEMENT,
        'label': 'Transmettre à l\'établissement pour signature Doyen/Directeur'
    },
    'VALIDER_SIGNATURE_ETABLISSEMENT': {
        'roles': [Utilisateur.Role.SCOLARITE_ETABLISSEMENT, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.EN_ATTENTE_SIGNATURE_ETABLISSEMENT],
        'nouveau_statut': Statut.SIGNE_ETABLISSEMENT,
        'label': 'Enregistrer signature Doyen/Directeur'
    },

    # ── Étape 7 : Transmission au Président ───────────────────────────────────
    'CONFIER_TRANSMISSION_PRESIDENT': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.SIGNE_ETABLISSEMENT],
        'nouveau_statut': Statut.EN_TRANSMISSION_PRESIDENT,
        'label': 'Confier à l\'agent de transmission vers Présidence'
    },
    'REMETTRE_PRESIDENCE': {
        'roles': [Utilisateur.Role.AGENT_TRANSMISSION, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.EN_TRANSMISSION_PRESIDENT],
        'nouveau_statut': Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
        'label': 'Enregistrer remise au secrétariat de la Présidence'
    },

    # ── Étape 8 : Signature du Président de l'Université ───────────────────────
    'SIGNER_PRESIDENT': {
        'roles': [Utilisateur.Role.PRESIDENCE],
        'depuis': [Statut.EN_ATTENTE_SIGNATURE_PRESIDENT],
        'nouveau_statut': Statut.SIGNE_PRESIDENT,
        'label': 'Apposer signature présidentielle'
    },

    # ── Étape 9 : Retour & Retrait final ──────────────────────────────────────
    'ACHEMINER_RETOUR': {
        'roles': [Utilisateur.Role.AGENT_TRANSMISSION, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.SIGNE_PRESIDENT],
        'nouveau_statut': Statut.RETOUR_SCOLARITE,
        'label': 'Acheminer le diplôme signé en retour vers scolarité'
    },
    'METTRE_A_DISPOSITION': {
        'roles': [Utilisateur.Role.SCOLARITE_ETABLISSEMENT, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.RETOUR_SCOLARITE, Statut.SIGNE_PRESIDENT],
        'nouveau_statut': Statut.DISPONIBLE,
        'label': 'Marquer disponible pour retrait au guichet'
    },
    'ENREGISTRER_RETRAIT': {
        'roles': [Utilisateur.Role.SCOLARITE_ETABLISSEMENT, Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.DISPONIBLE],
        'nouveau_statut': Statut.RETIRE,
        'label': 'Enregistrer le retrait effectif par l\'étudiant'
    },
}


class DemandeDiplomeViewSet(viewsets.ModelViewSet):
    queryset = DemandeDiplome.objects.all().order_by('-date_demande')
    serializer_class = DemandeDiplomeSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        allowed_creation_roles = [
            Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
            Utilisateur.Role.CHEF_SERVICE,
            Utilisateur.Role.SCOLARITE_CENTRALE,
            Utilisateur.Role.PRESIDENCE,
        ]
        if user.role not in allowed_creation_roles:
            return Response(
                {'error': "Vous n'êtes pas autorisé à créer une demande de diplôme."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        etudiant_id = data.get('etudiant')
        
        matricule = data.get('matricule', '').strip().upper()
        if not etudiant_id and matricule:
            etudiant, _ = Etudiant.objects.get_or_create(
                matricule=matricule,
                defaults={
                    'nom': data.get('nom', '').strip().upper(),
                    'prenom': data.get('prenom', '').strip(),
                    'cin': data.get('cin', matricule).strip(),
                    'date_naissance': data.get('date_naissance', '2000-01-01'),
                    'faculte': data.get('faculte', user.etablissement or 'Faculté des Sciences'),
                    'filiere': data.get('filiere', 'Générale'),
                    'niveau_etude': data.get('niveau_etude', 'Master 2'),
                }
            )
            data['etudiant'] = etudiant.id

        data.pop('statut', None)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        etablissement_nom = user.etablissement or data.get('faculte') or 'Établissement'
        demande = serializer.save(
            statut=Statut.EN_ATTENTE_VERIFICATION,
            agent_responsable=user,
            etablissement_origine=etablissement_nom
        )

        Historique.objects.create(
            demande=demande,
            utilisateur=user,
            role_utilisateur=user.role,
            action_realisee=f"Dossier physique saisi au guichet par {user.get_role_display()} ({user.username})",
            ancien_statut=None,
            nouveau_statut=Statut.EN_ATTENTE_VERIFICATION,
            commentaire=data.get('observations', 'Dossier complet remis au guichet.')
        )

        # Notification automatique à la Scolarité Centrale
        create_notification_for_role(
            role=Utilisateur.Role.SCOLARITE_CENTRALE,
            titre=f"Nouveau dossier en attente (#{demande.id})",
            message=f"Le dossier de {demande.etudiant.nom} {demande.etudiant.prenom} ({demande.etudiant.matricule}) de {demande.etablissement_origine} est en attente de vérification."
        )

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(demande).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        return Response(
            {'error': "Modification directe non autorisée. Utilisez l'action passer_etape."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    partial_update = update

    def destroy(self, request, *args, **kwargs):
        return Response({'error': 'Suppression non autorisée.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return DemandeDiplome.objects.none()

        # Filtrage strict par rôle pour le cloisonnement RBAC
        if user.role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT:
            if user.etablissement:
                queryset = queryset.filter(
                    Q(etudiant__faculte__icontains=user.etablissement) |
                    Q(etablissement_origine__icontains=user.etablissement)
                )
        elif user.role == Utilisateur.Role.IMPRIMEUR:
            queryset = queryset.filter(
                Q(imprimeur_assigne=user) |
                Q(statut__in=[
                    Statut.EN_ATTENTE_IMPRESSION,
                    Statut.EN_IMPRESSION,
                    Statut.IMPRIME
                ])
            )
        elif user.role == Utilisateur.Role.AGENT_TRANSMISSION:
            queryset = queryset.filter(
                Q(agent_transmission=user) |
                Q(statut__in=[
                    Statut.SIGNE_ETABLISSEMENT,
                    Statut.EN_TRANSMISSION_PRESIDENT,
                    Statut.EN_ATTENTE_SIGNATURE_PRESIDENT,
                    Statut.SIGNE_PRESIDENT,
                    Statut.RETOUR_SCOLARITE
                ])
            )

        # Filtres génériques (recherche, statut, dates, faculté)
        statut_filter = self.request.query_params.get('statut', None)
        search_filter = self.request.query_params.get('search', None)
        faculte_filter = self.request.query_params.get('faculte', None)
        filiere_filter = self.request.query_params.get('filiere', None)
        date_debut_filter = self.request.query_params.get('date_debut', None)
        date_fin_filter = self.request.query_params.get('date_fin', None)

        if statut_filter:
            queryset = queryset.filter(statut=statut_filter)
        if faculte_filter:
            queryset = queryset.filter(etudiant__faculte__icontains=faculte_filter)
        if filiere_filter:
            queryset = queryset.filter(etudiant__filiere__icontains=filiere_filter)
        if date_debut_filter:
            queryset = queryset.filter(date_demande__gte=date_debut_filter)
        if date_fin_filter:
            queryset = queryset.filter(date_demande__lte=date_fin_filter)
        if search_filter:
            queryset = queryset.filter(
                Q(etudiant__matricule__icontains=search_filter) |
                Q(etudiant__nom__icontains=search_filter) |
                Q(etudiant__prenom__icontains=search_filter) |
                Q(type_diplome__icontains=search_filter)
            )
        return queryset

    @action(detail=True, methods=['post'])
    def passer_etape(self, request, pk=None):
        demande = self.get_object()
        action_type = request.data.get('action')
        observations = request.data.get('observations', '').strip()
        mention = request.data.get('mention', '').strip()
        imprimeur_id = request.data.get('imprimeur_id')
        agent_transmission_id = request.data.get('agent_transmission_id')
        nom_retirant = request.data.get('nom_retirant', '').strip()
        user = request.user

        transition = TRANSITIONS_AUTORISEES.get(action_type)
        if transition is None:
            return Response(
                {'error': f"Action '{action_type}' non reconnue."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role not in transition['roles'] and not user.is_superuser:
            return Response(
                {'error': f"Votre profil ({user.get_role_display()}) n'est pas habilité à effectuer l'action '{transition['label']}'."},
                status=status.HTTP_403_FORBIDDEN
            )

        if demande.statut not in transition['depuis']:
            return Response(
                {'error': f"Action impossible : le dossier est actuellement à l'état '{demande.get_statut_display()}'."},
                status=status.HTTP_409_CONFLICT
            )

        ancien_statut = demande.statut
        nouveau_statut = transition['nouveau_statut']
        action_desc = f"{transition['label']} par {user.get_role_display()} ({user.username})"

        # ── Traitement spécifique selon l'action ──────────────────────────────
        if 'has_pv_soutenance' in request.data:
            demande.has_pv_soutenance = bool(request.data.get('has_pv_soutenance'))
        if 'has_releve_notes' in request.data:
            demande.has_releve_notes = bool(request.data.get('has_releve_notes'))
        if 'has_certificat_scolarite' in request.data:
            demande.has_certificat_scolarite = bool(request.data.get('has_certificat_scolarite'))
        if 'has_recu_bancaire' in request.data:
            demande.has_recu_bancaire = bool(request.data.get('has_recu_bancaire'))

        if action_type == 'MARQUER_INCOMPLET':
            demande.observations = observations or "Dossier incomplet. Pièces justificatives à fournir."
            create_notification_for_role(
                role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
                titre=f"Dossier #{demande.id} incomplet",
                message=f"Le dossier de {demande.etudiant.matricule} nécessite des compléments : {demande.observations}"
            )

        elif action_type == 'VALIDER_SCOLARITE_CENTRALE':
            demande.observations = observations or "Dossier et conformité académique validés."
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Dossier validé pour traitement (#{demande.id})",
                message=f"Le dossier de {demande.etudiant.nom} {demande.etudiant.prenom} ({demande.etudiant.matricule}) est validé par la Scolarité Centrale."
            )

        elif action_type == 'REFUSER':
            demande.observations = observations or "Demande refusée lors de l'examen de conformité."
            action_desc = f"Demande refusée par {user.get_role_display()} ({user.username}). Motif : {demande.observations}"
            create_notification_for_role(
                role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
                titre=f"Dossier #{demande.id} refusé",
                message=f"Le dossier de {demande.etudiant.matricule} a été refusé : {demande.observations}"
            )

        elif action_type == 'COMPLETER_DOSSIER':
            demande.has_pv_soutenance = True
            demande.has_releve_notes = True
            demande.has_certificat_scolarite = True
            demande.has_recu_bancaire = True
            if observations:
                demande.observations = observations
            create_notification_for_role(
                role=Utilisateur.Role.SCOLARITE_CENTRALE,
                titre=f"Dossier #{demande.id} complété",
                message=f"L'établissement a complété les pièces du dossier de {demande.etudiant.matricule}."
            )

        elif action_type == 'AFFECTER_IMPRIMEUR':
            if imprimeur_id:
                try:
                    imp_user = Utilisateur.objects.get(id=imprimeur_id, role=Utilisateur.Role.IMPRIMEUR)
                    demande.imprimeur_assigne = imp_user
                    create_notification_for_role(
                        role=Utilisateur.Role.IMPRIMEUR,
                        titre="Nouvelle demande d'impression assignée",
                        message=f"Le dossier #{demande.id} ({demande.etudiant.nom} {demande.etudiant.prenom}) vous a été affecté.",
                        user_target=imp_user
                    )
                except Utilisateur.DoesNotExist:
                    pass
            else:
                create_notification_for_role(
                    role=Utilisateur.Role.IMPRIMEUR,
                    titre="Nouvelle demande d'impression disponible",
                    message=f"Le dossier #{demande.id} ({demande.etudiant.matricule}) est prêt pour impression."
                )

        elif action_type == 'TERMINER_IMPRESSION':
            demande.date_impression = timezone.now()
            from diplomes.models import Diplome
            Diplome.objects.get_or_create(
                demande=demande,
                defaults={
                    'numero_diplome': Diplome.generer_numero(demande.date_impression.year),
                    'code_verification': Diplome.generer_code_verification(),
                }
            )
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Impression terminée (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.nom} {demande.etudiant.prenom} a été imprimé."
            )

        elif action_type == 'TRANSMETTRE_SIGNATURE_ETABLISSEMENT':
            create_notification_for_role(
                role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
                titre=f"Diplôme à faire signer (#{demande.id})",
                message=f"Le diplôme imprimé de {demande.etudiant.matricule} est transmis pour signature du Doyen/Directeur."
            )

        elif action_type == 'VALIDER_SIGNATURE_ETABLISSEMENT':
            demande.date_signature_etablissement = timezone.now()
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Signature établissement effectuée (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.matricule} a été signé par le Doyen/Directeur."
            )

        elif action_type == 'CONFIER_TRANSMISSION_PRESIDENT':
            demande.date_transmission_president = timezone.now()
            if agent_transmission_id:
                try:
                    ag_user = Utilisateur.objects.get(id=agent_transmission_id, role=Utilisateur.Role.AGENT_TRANSMISSION)
                    demande.agent_transmission = ag_user
                    create_notification_for_role(
                        role=Utilisateur.Role.AGENT_TRANSMISSION,
                        titre="Diplôme à acheminer à la Présidence",
                        message=f"Le diplôme #{demande.id} vous est confié pour transmission à la Présidence.",
                        user_target=ag_user
                    )
                except Utilisateur.DoesNotExist:
                    pass
            else:
                create_notification_for_role(
                    role=Utilisateur.Role.AGENT_TRANSMISSION,
                    titre="Diplôme à acheminer à la Présidence",
                    message=f"Le diplôme #{demande.id} ({demande.etudiant.matricule}) est prêt pour acheminement."
                )

        elif action_type == 'REMETTRE_PRESIDENCE':
            create_notification_for_role(
                role=Utilisateur.Role.PRESIDENCE,
                titre="Diplôme en attente de signature",
                message=f"Le diplôme #{demande.id} de {demande.etudiant.nom} {demande.etudiant.prenom} ({demande.type_diplome}) est déposé pour votre signature."
            )

        elif action_type == 'SIGNER_PRESIDENT':
            demande.date_signature_president = timezone.now()
            from diplomes.models import Diplome
            diplome = getattr(demande, 'diplome', None)
            if diplome:
                diplome.date_delivrance = demande.date_signature_president.date()
                if mention:
                    diplome.mention = mention
                diplome.save()
            create_notification_for_role(
                role=Utilisateur.Role.AGENT_TRANSMISSION,
                titre=f"Diplôme signé par le Président (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.matricule} est signé et prêt pour retour vers la scolarité."
            )
            create_notification_for_role(
                role=Utilisateur.Role.CHEF_SERVICE,
                titre=f"Diplôme signé par la Présidence (#{demande.id})",
                message=f"Le diplôme de {demande.etudiant.matricule} a été signé."
            )

        elif action_type == 'ACHEMINER_RETOUR':
            create_notification_for_role(
                role=Utilisateur.Role.SCOLARITE_ETABLISSEMENT,
                titre=f"Diplôme en retour (#{demande.id})",
                message=f"Le diplôme officiel de {demande.etudiant.matricule} a été acheminé en retour à l'établissement."
            )

        elif action_type == 'METTRE_A_DISPOSITION':
            demande.date_disponibilite = timezone.now()

        elif action_type == 'ENREGISTRER_RETRAIT':
            demande.date_retrait = timezone.now()
            demande.nom_retirant = nom_retirant or f"{demande.etudiant.nom} {demande.etudiant.prenom} (Titulaire)"
            action_desc = f"Diplôme remis et retiré par {demande.nom_retirant}"

        demande.statut = nouveau_statut
        demande.agent_responsable = user
        demande.save()

        # Enregistrement systématique dans l'historique d'audit
        Historique.objects.create(
            demande=demande,
            utilisateur=user,
            role_utilisateur=user.role,
            action_realisee=action_desc,
            ancien_statut=ancien_statut,
            nouveau_statut=nouveau_statut,
            commentaire=observations or None
        )

        return Response(DemandeDiplomeSerializer(demande).data)

    @action(detail=False, methods=['get'])
    def stats_overview(self, request):
        user = request.user
        base_qs = DemandeDiplome.objects.all()
        
        if user.role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT and user.etablissement:
            base_qs = base_qs.filter(
                Q(etudiant__faculte__icontains=user.etablissement) |
                Q(etablissement_origine__icontains=user.etablissement)
            )

        total = base_qs.count()
        en_attente_verif = base_qs.filter(statut=Statut.EN_ATTENTE_VERIFICATION).count()
        dossier_incomplet = base_qs.filter(statut=Statut.DOSSIER_INCOMPLET).count()
        refusees = base_qs.filter(statut=Statut.REFUSEE).count()
        validees = base_qs.filter(statut=Statut.VALIDEE).count()
        
        # Total des demandes validées par la scolarité centrale (qui continuent leur cycle aval)
        validees_total = base_qs.exclude(statut__in=[
            Statut.EN_ATTENTE_VERIFICATION, 
            Statut.DOSSIER_INCOMPLET, 
            Statut.REFUSEE
        ]).count()
        en_attente_total = en_attente_verif + dossier_incomplet

        en_traitement = base_qs.filter(statut=Statut.EN_TRAITEMENT).count()
        en_attente_imp = base_qs.filter(statut=Statut.EN_ATTENTE_IMPRESSION).count()
        en_impression = base_qs.filter(statut=Statut.EN_IMPRESSION).count()
        imprimees = base_qs.filter(statut=Statut.IMPRIME).count()
        attente_sig_etab = base_qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_ETABLISSEMENT).count()
        signees_etab = base_qs.filter(statut=Statut.SIGNE_ETABLISSEMENT).count()
        en_trans_pres = base_qs.filter(statut=Statut.EN_TRANSMISSION_PRESIDENT).count()
        attente_sig_pres = base_qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).count()
        signees_pres = base_qs.filter(statut=Statut.SIGNE_PRESIDENT).count()
        retour_scol = base_qs.filter(statut=Statut.RETOUR_SCOLARITE).count()
        disponibles = base_qs.filter(statut=Statut.DISPONIBLE).count()
        retirees = base_qs.filter(statut=Statut.RETIRE).count()
        refusees = base_qs.filter(statut=Statut.REFUSEE).count()

        facultes = list(base_qs.values('etudiant__faculte').annotate(count=Count('id')).order_by('-count'))

        return Response({
            'total': total,
            'en_attente_total': en_attente_total,
            'validees_total': validees_total,
            'en_attente_verif': en_attente_verif,
            'dossier_incomplet': dossier_incomplet,
            'validees': validees,
            'en_traitement': en_traitement,
            'en_attente_imp': en_attente_imp,
            'en_impression': en_impression,
            'imprimees': imprimees,
            'attente_sig_etab': attente_sig_etab,
            'signees_etab': signees_etab,
            'en_trans_pres': en_trans_pres,
            'attente_sig_pres': attente_sig_pres,
            'signees_pres': signees_pres,
            'retour_scol': retour_scol,
            'disponibles': disponibles,
            'retirees': retirees,
            'refusees': refusees,
            'facultes': facultes
        })

    @action(detail=False, methods=['get'])
    def kpi_presidence(self, request):
        if request.user.role not in [Utilisateur.Role.PRESIDENCE, Utilisateur.Role.CHEF_SERVICE]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            
        demandes = DemandeDiplome.objects.filter(
            statut__in=[Statut.DISPONIBLE, Statut.RETIRE],
            date_disponibilite__isnull=False
        )
        total_time_seconds = 0
        count = 0
        for d in demandes:
            diff = d.date_disponibilite - d.date_demande
            total_time_seconds += diff.total_seconds()
            count += 1
            
        avg_seconds = total_time_seconds / count if count > 0 else 0
        avg_days = avg_seconds / (3600 * 24)
        
        return Response({
            'total_diplomes_delivres': count,
            'delai_moyen_jours': round(avg_days, 1),
            'en_attente_signature': DemandeDiplome.objects.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).count(),
            'signes_president': DemandeDiplome.objects.filter(statut__in=[Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE, Statut.DISPONIBLE, Statut.RETIRE]).count()
        })


class HistoriqueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Historique.objects.all().order_by('-date_action')
    serializer_class = HistoriqueSerializer
    permission_classes = [IsAuthenticated]
