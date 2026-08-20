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

# Chaque transition du circuit : rôle(s) autorisé(s) et étape(s) de départ valide(s).
# Empêche à la fois un rôle non habilité ET un saut d'étape (ex. signer un dossier
# qui n'a pas encore été imprimé).
TRANSITIONS_AUTORISEES = {
    'VALIDER_CHEF': {
        'roles': [Utilisateur.Role.CHEF_SERVICE],
        'depuis': [Statut.RECUE],
    },
    'PREPARER_SCOLARITE': {
        'roles': [Utilisateur.Role.SCOLARITE_CENTRALE],
        'depuis': [Statut.VERIFIEE_CHEF],
    },
    'IMPRIMER': {
        'roles': [Utilisateur.Role.IMPRIMEUR],
        'depuis': [Statut.SCOLARITE_PREPAREE],
    },
    'SIGNER': {
        'roles': [Utilisateur.Role.PRESIDENCE],
        'depuis': [Statut.IMPRIMEE],
    },
    'DISPONIBLE': {
        'roles': [Utilisateur.Role.PRESIDENCE],
        'depuis': [Statut.SIGNEE],
    },
    'REFUSER': {
        'roles': [
            Utilisateur.Role.CHEF_SERVICE,
            Utilisateur.Role.SCOLARITE_CENTRALE,
            Utilisateur.Role.IMPRIMEUR,
            Utilisateur.Role.PRESIDENCE,
        ],
        # Un dossier déjà signé/disponible ne peut plus être refusé.
        'depuis': [Statut.RECUE, Statut.VERIFIEE_CHEF, Statut.SCOLARITE_PREPAREE, Statut.IMPRIMEE],
    },
}

class DemandeDiplomeViewSet(viewsets.ModelViewSet):
    queryset = DemandeDiplome.objects.all().order_by('-date_demande')
    serializer_class = DemandeDiplomeSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != Utilisateur.Role.ETUDIANT:
            return super().create(request, *args, **kwargs)

        # Un étudiant ne peut soumettre un dossier que pour lui-même, avec le statut
        # initial imposé : le client ne doit pas pouvoir dicter 'etudiant' ou 'statut'.
        try:
            etudiant = user.etudiant_profile
        except Etudiant.DoesNotExist:
            return Response(
                {'error': "Aucun profil étudiant n'est associé à ce compte."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()
        data['etudiant'] = etudiant.id
        data.pop('statut', None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(etudiant=etudiant, statut=Statut.RECUE)
        Historique.objects.create(
            demande=serializer.instance,
            utilisateur=user,
            action_realisee=f"Dossier soumis en ligne par l'étudiant {etudiant.matricule}"
        )
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(serializer.instance).data, status=status.HTTP_201_CREATED, headers=headers)

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
        if user.is_authenticated and user.role == Utilisateur.Role.ETUDIANT:
            queryset = queryset.filter(etudiant__utilisateur=user)
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
        action_type = request.data.get('action') # VALIDER_CHEF, REFUSER, PREPARER_SCOLARITE, IMPRIMER, SIGNER, DISPONIBLE
        observations = request.data.get('observations', '')
        mention = request.data.get('mention', '').strip()
        user = request.user

        transition = TRANSITIONS_AUTORISEES.get(action_type)
        if transition is None:
            return Response({'error': 'Action invalide'}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in transition['roles']:
            return Response(
                {'error': "Vous n'êtes pas autorisé à effectuer cette action."},
                status=status.HTTP_403_FORBIDDEN
            )
        if demande.statut not in transition['depuis']:
            return Response(
                {'error': f"Action impossible : le dossier est actuellement à l'étape '{demande.get_statut_display()}'."},
                status=status.HTTP_409_CONFLICT
            )

        if action_type == 'REFUSER':
            demande.statut = DemandeDiplome.Statut.REFUSEE
            demande.observations = observations
            action_desc = f"Demande refusée par {user.get_role_display()} ({user.username}). Motif : {observations}"
        elif action_type == 'VALIDER_CHEF':
            demande.statut = DemandeDiplome.Statut.VERIFIEE_CHEF
            if observations:
                demande.observations = observations
            action_desc = f"Dossier vérifié et transmis à la Scolarité par {user.username}"
        elif action_type == 'PREPARER_SCOLARITE':
            demande.statut = DemandeDiplome.Statut.SCOLARITE_PREPAREE
            if observations:
                demande.observations = observations
            action_desc = f"Dossier académique préparé et transmis à l'Imprimeur par {user.username}"
        elif action_type == 'IMPRIMER':
            demande.statut = DemandeDiplome.Statut.IMPRIMEE
            demande.date_impression = timezone.now()
            action_desc = f"Diplôme imprimé par {user.username}"
        elif action_type == 'SIGNER':
            demande.statut = DemandeDiplome.Statut.SIGNEE
            demande.date_signature = timezone.now()
            action_desc = f"Diplôme signé par la Présidence ({user.username})"
        elif action_type == 'DISPONIBLE':
            demande.statut = DemandeDiplome.Statut.DISPONIBLE
            demande.date_disponibilite = timezone.now()
            action_desc = f"Diplôme marqué DISPONIBLE AU RETRAIT par {user.username}"

        demande.agent_responsable = user
        demande.save()

        # Le numéro/code officiels sont réservés dès l'impression (ils seront imprimés
        # sur le papier sécurisé) ; la date de délivrance n'est fixée qu'à la signature.
        from diplomes.models import Diplome
        if action_type == 'IMPRIMER':
            Diplome.objects.get_or_create(
                demande=demande,
                defaults={
                    'numero_diplome': Diplome.generer_numero(demande.date_impression.year),
                    'code_verification': Diplome.generer_code_verification(),
                }
            )
        elif action_type == 'SIGNER':
            diplome = getattr(demande, 'diplome', None)
            if diplome:
                diplome.date_delivrance = demande.date_signature.date()
                if mention:
                    diplome.mention = mention
                diplome.save()

        # Enregistrer l'historique
        Historique.objects.create(
            demande=demande,
            utilisateur=user,
            action_realisee=action_desc
        )

        # Créer notification
        Notification.objects.create(
            utilisateur=demande.etudiant.utilisateur,
            titre=f"Mise à jour demande #{demande.id}",
            message=f"La demande du matricule {demande.etudiant.matricule} est passée à l'état '{demande.get_statut_display()}'.",
            type_notification='INFO'
        )

        return Response(DemandeDiplomeSerializer(demande).data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public_verification(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({
                'disponible': False,
                'message': "Veuillez entrer votre matricule ou votre nom complet."
            })

        # Recherche par matricule/nom (grand public) ou par code de vérification
        # imprimé sur le diplôme (contrôle précis, ex. par un tiers ou un employeur).
        demandes = DemandeDiplome.objects.filter(
            Q(etudiant__matricule__iexact=query) |
            Q(etudiant__nom__icontains=query) |
            Q(etudiant__prenom__icontains=query) |
            Q(diplome__code_verification__iexact=query)
        ).select_related('etudiant', 'diplome').order_by('-date_demande')

        if not demandes.exists():
            return Response({
                'disponible': False,
                'message': "Aucun dossier trouvé pour cette référence. Veuillez réessayer ultérieurement."
            })

        demande = demandes.first()
        etudiant = demande.etudiant

        if demande.statut == DemandeDiplome.Statut.DISPONIBLE:
            date_disp_str = demande.date_disponibilite.strftime("%d/%m/%Y") if demande.date_disponibilite else "Récemment"
            diplome = getattr(demande, 'diplome', None)
            return Response({
                'disponible': True,
                'statut': demande.statut,
                'statut_display': demande.get_statut_display(),
                'matricule': etudiant.matricule,
                'nom': etudiant.nom,
                'prenom': etudiant.prenom,
                'faculte': etudiant.faculte,
                'filiere': etudiant.filiere,
                'type_diplome': demande.type_diplome,
                'date_disponibilite': date_disp_str,
                'numero_diplome': diplome.numero_diplome if diplome else None,
                'mention': diplome.mention if diplome else '',
                'message': "Votre diplôme est disponible. Veuillez vous présenter au service des diplômes muni de votre carte d'étudiant ou d'une pièce d'identité."
            })
        else:
            return Response({
                'disponible': False,
                'statut': demande.statut,
                'statut_display': demande.get_statut_display(),
                'matricule': etudiant.matricule,
                'nom': etudiant.nom,
                'prenom': etudiant.prenom,
                'faculte': etudiant.faculte,
                'filiere': etudiant.filiere,
                'type_diplome': demande.type_diplome,
                'message': "Votre diplôme n'est pas encore disponible. Veuillez réessayer ultérieurement."
            })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def stats_overview(self, request):
        # Utilisé à la fois par la page d'accueil publique (bandeau "chiffres clés")
        # et par le tableau de bord administratif : ce sont des compteurs agrégés,
        # sans donnée nominative, donc sans risque à exposer publiquement.
        total = DemandeDiplome.objects.count()
        recues = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.RECUE).count()
        verifiees = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.VERIFIEE_CHEF).count()
        preparees = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.SCOLARITE_PREPAREE).count()
        imprimees = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.IMPRIMEE).count()
        signees = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.SIGNEE).count()
        disponibles = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.DISPONIBLE).count()
        refusees = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.REFUSEE).count()

        # Groupement par faculté
        facultes = list(DemandeDiplome.objects.values('etudiant__faculte').annotate(count=Count('id')).order_by('-count'))

        return Response({
            'total': total,
            'recues': recues,
            'verifiees': verifiees,
            'preparees': preparees,
            'imprimees': imprimees,
            'signees': signees,
            'disponibles': disponibles,
            'refusees': refusees,
            'facultes': facultes
        })

    @action(detail=False, methods=['get'])
    def kpi_presidence(self, request):
        if request.user.role != 'PRESIDENCE':
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            
        demandes = DemandeDiplome.objects.filter(statut=DemandeDiplome.Statut.DISPONIBLE, date_disponibilite__isnull=False)
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
            'delai_moyen_jours': round(avg_days, 1)
        })

class HistoriqueViewSet(viewsets.ReadOnlyModelViewSet):
    # Lecture seule : les entrées d'historique sont créées uniquement côté serveur
    # dans passer_etape, jamais via un appel direct à cette API.
    queryset = Historique.objects.all().order_by('-date_action')
    serializer_class = HistoriqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == Utilisateur.Role.ETUDIANT:
            queryset = queryset.filter(demande__etudiant__utilisateur=user)
        return queryset
