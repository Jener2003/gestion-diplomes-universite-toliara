import re
import unicodedata
from datetime import datetime, date
from django.utils import timezone
from django.db.models import Count, Avg, Q

from demandes.models import DemandeDiplome, Historique
from utilisateurs.models import Utilisateur, Etudiant
from diplomes.models import Diplome
from notifications.models import Notification
from demandes.views import demandes_visibles_par

Statut = DemandeDiplome.Statut

EXPLICATIONS_STATUTS = {
    'EN_ATTENTE_VERIFICATION': "Le dossier a été déposé et saisi par la Scolarité de l'établissement. Il est actuellement en attente d'examen et de contrôle d'admission par la Scolarité Centrale.",
    'DOSSIER_INCOMPLET': "La Scolarité Centrale a relevé qu'une ou plusieurs pièces justificatives sont manquantes ou non conformes. Le dossier est renvoyé à l'établissement pour régularisation.",
    'REFUSEE': "La demande a été rejetée après examen par la Scolarité Centrale (étudiant non admis, irrégularité majeure de cursus ou motif formel notifié).",
    'VALIDEE': "La conformité académique et l'admission ont été certifiées par la Scolarité Centrale. Le dossier est prêt pour prise en charge par le Chef de Service des Diplômes.",
    'EN_TRAITEMENT': "Le Chef de Service a pris en charge le dossier pour vérification administrative et préparation de l'impression.",
    'EN_ATTENTE_IMPRESSION': "Le dossier a été affecté à un Concepteur/Imprimeur pour tirage officiel sur papier sécurisé.",
    'EN_IMPRESSION': "L'imprimeur a démarré la composition et le tirage du diplôme.",
    'IMPRIME': "Le tirage est terminé. Le numéro officiel annuel 'UT-AAAA-NNNNN' et le code cryptographique anti-fraude ont été réservés.",
    'EN_TRANSMISSION_PRESIDENT': "Le diplôme est confié aux agents de transmission pour acheminement physique sécurisé vers la Présidence de l'Université.",
    'EN_ATTENTE_SIGNATURE_PRESIDENT': "Le diplôme est déposé au secrétariat de la Présidence, en attente de signature par Monsieur le Président de l'Université.",
    'SIGNE_PRESIDENT': "Le Président de l'Université a officiellement signé le diplôme et validé la mention attribuée.",
    'RETOUR_SCOLARITE': "Après signature par le Président, le diplôme est acheminé au Chef de service des diplômes, où le circuit de traitement s'achève."
}


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.lower()


class ChatbotSecurityService:
    """
    Service d'assistance conversationnelle basé sur les données réelles de la plateforme.
    Permet aux agents d'interroger rapidement la base de données sans recherches manuelles,
    tout en garantissant le cloisonnement strict des accès selon le rôle connecté (RBAC).
    """

    @classmethod
    def get_base_queryset(cls, user: Utilisateur):
        """
        Demandes de l'espace de l'utilisateur connecté, et uniquement celles-là.
        Même règle que le tableau de bord (demandes_visibles_par) : le chatbot d'un
        rôle ne voit jamais les données d'un autre espace.
        """
        qs = DemandeDiplome.objects.select_related(
            'etudiant', 'agent_responsable', 'imprimeur_assigne', 'diplome'
        ).prefetch_related('historique__utilisateur')
        return demandes_visibles_par(user, qs)

    @classmethod
    def process_message(cls, user: Utilisateur, message: str) -> dict:
        query = message.strip()
        if not query:
            return {
                "reply": f"Bonjour **{user.get_role_display()}** ! En quoi puis-je vous assister aujourd'hui dans vos fonctions administratives ?",
                "suggestions": cls.get_suggestions_for_role(user.role)
            }

        role = user.role
        query_norm = normalize_text(query)

        # ── 1. Explication d'un statut (si question de définition) ─────────────
        is_definition_question = any(k in query_norm for k in ['signifie', 'definition', 'explication', 'c\'est quoi', 'qu\'est ce que', 'veut dire', 'statut'])
        if is_definition_question or len(query_norm.split()) <= 2:
            if not any(k in query_norm for k in ['demande', 'dossier', 'affiche', 'combien', 'liste', 'toutes']):
                for statut_code, explic in EXPLICATIONS_STATUTS.items():
                    statut_norm = normalize_text(statut_code)
                    statut_spaced = normalize_text(statut_code.replace('_', ' '))
                    if statut_norm in query_norm or statut_spaced in query_norm:
                        return {
                            "reply": f"ℹ️ **Explication du statut `{statut_code}`** :\n\n{explic}",
                            "suggestions": cls.get_suggestions_for_role(user.role)
                        }

        # ── 2. Recherche et questions transversales axées sur les données ─────
        # Disponible pour la Scolarité Centrale, Chef de Service, Scolarité Établissement, etc.
        data_reply = cls._dispatch_data_queries(user, query, query_norm)
        if data_reply is not None:
            return data_reply

        # ── 3. Routage spécifique par rôle si non capté par les filtres globaux
        if role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT:
            return cls._handle_scolarite_etablissement(user, query, query_norm)
        elif role == Utilisateur.Role.SCOLARITE_CENTRALE:
            return cls._handle_scolarite_centrale(user, query, query_norm)
        elif role == Utilisateur.Role.CHEF_SERVICE:
            return cls._handle_chef_service(user, query, query_norm)
        elif role == Utilisateur.Role.IMPRIMEUR:
            return cls._handle_imprimeur(user, query, query_norm)
        elif role == Utilisateur.Role.AGENT_TRANSMISSION:
            return cls._handle_agent_transmission(user, query, query_norm)
        elif role == Utilisateur.Role.PRESIDENCE:
            return cls._handle_presidence(user, query, query_norm)
        else:
            return {
                "reply": "Votre profil ne dispose pas d'un rôle administratif habilité sur cet intranet.",
                "suggestions": []
            }

    # =========================================================================
    # MOTEUR DE REQUÊTES EN LANGAGE NATUREL (DONNÉES RÉELLES MYSQL / DJANGO)
    # =========================================================================
    @classmethod
    def _dispatch_data_queries(cls, user: Utilisateur, query: str, query_norm: str):
        qs = cls.get_base_queryset(user)

        # A. CONSULTER LES DEMANDES
        # 1. Total des demandes reçues
        if any(re.search(p, query_norm) for p in [
            r'combien.*demande.*re[cç]ue',
            r'nombre.*total.*demande',
            r'total.*demandes',
            r'toutes les demandes.*re[cç]ues'
        ]):
            total = qs.count()
            a_verifier = qs.filter(statut=Statut.EN_ATTENTE_VERIFICATION).count()
            validees = qs.filter(statut=Statut.VALIDEE).count()
            en_cours = qs.filter(statut__in=[Statut.EN_TRAITEMENT, Statut.EN_ATTENTE_IMPRESSION, Statut.EN_IMPRESSION, Statut.IMPRIME]).count()
            signees = qs.filter(statut__in=[Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE]).count()
            rejetees = qs.filter(statut=Statut.REFUSEE).count()
            incompletes = qs.filter(statut=Statut.DOSSIER_INCOMPLET).count()

            reponse = (
                f"📊 **Bilan global des demandes de diplôme** ({total} dossier(s) au total) :\n\n"
                f"- ⏳ **En attente de vérification** : **{a_verifier}**\n"
                f"- ✅ **Validées par la Scolarité Centrale** : **{validees}**\n"
                f"- ⚙️ **En traitement / En cours de tirage** : **{en_cours}**\n"
                f"- ✍️ **Signées par la Présidence** : **{signees}**\n"
                f"- ❌ **Rejetées / Refusées** : **{rejetees}**\n"
                f"- ⚠️ **Dossiers incomplets** : **{incompletes}**\n"
            )
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Affiche-moi toutes les demandes validées", "Nouvelles demandes reçues aujourd'hui"]
            }

        # 2. Nouvelles demandes reçues aujourd'hui
        if any(re.search(p, query_norm) for p in [
            r'nouvelle.*demande.*aujourd\'?hui',
            r'demande.*re[cç]ue.*aujourd\'?hui',
            r'demandes.*du jour',
            r're[cç]ues.*aujourd\'?hui'
        ]):
            today = timezone.now().date()
            demandes_today = qs.filter(date_demande__date=today).order_by('-date_demande')
            count = demandes_today.count()
            if count == 0:
                reponse = f"📅 **Nouvelles demandes reçues aujourd'hui ({today.strftime('%d/%m/%Y')})** : **0**\n\nAucune nouvelle demande n'a encore été enregistrée au guichet aujourd'hui."
            else:
                reponse = f"📅 **Nouvelles demandes reçues aujourd'hui ({today.strftime('%d/%m/%Y')}) : {count}**\n\n"
                reponse += cls._format_demandes_list(demandes_today[:8])
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Combien de demandes au total ?"]
            }

        # 3. Demandes en attente de vérification
        if any(re.search(p, query_norm) for p in [
            r'attente.*verification',
            r'quelles.*demandes.*en attente',
            r'combien.*demandes.*en attente',
            r'dossiers.*en attente',
            r'demandes a verifier',
            r'restent a verifier'
        ]):
            a_verifier = qs.filter(statut=Statut.EN_ATTENTE_VERIFICATION).order_by('-date_demande')
            count = a_verifier.count()
            reponse = f"📋 **Demandes en attente de vérification d'admission : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(a_verifier[:10])
                reponse += "\n👉 *Vérifiez l'admissibilité académique sur la liste officielle avant de cliquer sur « Valider ».*"
            else:
                reponse += "✅ Toutes les demandes reçues ont été vérifiées et traitées !"
            return {
                "reply": reponse,
                "suggestions": ["Affiche-moi toutes les demandes validées", "Quelles demandes ont été rejetées ?", "Combien de demandes de diplômes avons-nous reçues ?"]
            }

        # 4. Demandes validées
        if any(re.search(p, query_norm) for p in [
            r'demandes.*validees',
            r'affiche.*demandes.*validees',
            r'toutes les demandes validees'
        ]):
            validees = qs.filter(statut=Statut.VALIDEE).order_by('-date_demande')
            count = validees.count()
            reponse = f"✅ **Demandes actuellement validées : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(validees[:10])
            else:
                reponse += "ℹ️ Aucune demande n'est actuellement au statut « Validée »."
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Quelles demandes ont déjà été transmises au chef de service ?"]
            }

        # 5. Demandes rejetées / refusées
        if any(re.search(p, query_norm) for p in [
            r'demandes.*rejetees',
            r'demandes.*refusees',
            r'quelles demandes ont ete rejetees',
            r'combien de demandes ont ete rejetees'
        ]):
            rejetees = qs.filter(statut=Statut.REFUSEE).order_by('-date_demande')
            count = rejetees.count()
            reponse = f"❌ **Demandes rejetées / refusées : {count}**\n\n"
            if count > 0:
                for d in rejetees[:8]:
                    motif = d.observations or "Non-conformité de dossier ou étudiant non admis"
                    reponse += f"- **Dossier #{d.id}** : **{d.etudiant.nom} {d.etudiant.prenom}** (`{d.etudiant.matricule}`) · *{d.type_diplome}*\n  ⚠️ *Motif : {motif}*\n"
            else:
                reponse += "✅ Aucune demande n'a été rejetée."
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Combien de demandes de diplômes avons-nous reçues ?"]
            }

        # B. RETROUVER UN ÉTUDIANT OU UNE DEMANDE
        # 1. Recherche par référence (ex: #1, référence 14, D-2026-014)
        is_specific_intent = any(k in query_norm for k in [
            'admission', 'historique', 'precedent', 'anterieur', 'quel diplome', 'annee universitaire de reference', 'annee de reference'
        ])
        ref_match = re.search(r'(?:demande|dossier|reference|ref)?\s*#?\s*(?:d[-_]\d{4}[-_])?(\d{1,6})\b', query_norm)
        if not is_specific_intent and ('reference' in query_norm or 'dossier' in query_norm or '#' in query or 'd-' in query_norm) and ref_match:
            ref_id = int(ref_match.group(1))
            demande = qs.filter(id=ref_id).first()
            if demande:
                return {
                    "reply": cls._format_fiche_complete(demande),
                    "suggestions": [f"Donne-moi l'historique de la demande #{demande.id}", "L'admission de cet étudiant a-t-elle été vérifiée ?"]
                }
            else:
                return {
                    "reply": f"⚠️ Aucune demande trouvée avec la référence **#{ref_id}** dans votre périmètre d'accès.",
                    "suggestions": ["Quelles demandes sont en attente de vérification ?", "Combien de demandes de diplômes avons-nous reçues ?"]
                }

        # 2. Retrouver la demande par nom / prénom / matricule
        if any(k in query_norm for k in ['retrouve', 'cherche', 'recherche', 'ou en est la demande', 'dossier de l\'etudiant', 'demande de l\'etudiant', 'demande de']):
            # Extraire les mots-clés du nom après l'indicateur
            cleaned = query
            for prefix in ["retrouve la demande de l'étudiant", "retrouve la demande de l'etudiant", "retrouve la demande de", "recherche la demande de", "recherche l'étudiant", "recherche l'etudiant", "cherche la demande de", "demande de l'étudiant", "demande de l'etudiant", "demande de", "dossier de"]:
                pattern = re.compile(re.escape(prefix), re.IGNORECASE)
                cleaned = pattern.sub('', cleaned)

            cleaned_kw = cleaned.replace('?', '').replace('.', '').strip()
            if len(cleaned_kw) >= 2:
                results = qs.filter(
                    Q(etudiant__nom__icontains=cleaned_kw) |
                    Q(etudiant__prenom__icontains=cleaned_kw) |
                    Q(etudiant__matricule__icontains=cleaned_kw) |
                    Q(etudiant__cin__icontains=cleaned_kw)
                ).distinct()

                count = results.count()
                if count == 1:
                    d = results.first()
                    return {
                        "reply": f"🔍 **Dossier trouvé pour « {cleaned_kw} »** :\n\n" + cls._format_fiche_complete(d),
                        "suggestions": [f"Donne-moi l'historique de la demande #{d.id}", f"L'admission de cet étudiant a-t-elle été vérifiée ?"]
                    }
                elif count > 1:
                    reponse = f"🔍 **{count} demandes correspondent à « {cleaned_kw} »** :\n\n"
                    reponse += cls._format_demandes_list(results[:8])
                    reponse += "\n👉 *Précisez le numéro de référence pour afficher la fiche détaillée.*"
                    return {
                        "reply": reponse,
                        "suggestions": [f"Recherche la demande #{r.id}" for r in results[:2]]
                    }

        # 3. Demandes selon le cycle (Master, Licence, Doctorat, Ingénieur, Médecine)
        cycle_match = None
        for cycle in ['master', 'licence', 'doctorat', 'ingenieur', 'medecine']:
            if cycle in query_norm and ('demande' in query_norm or 'etudiant' in query_norm or 'concerne' in query_norm):
                cycle_match = cycle
                break

        if cycle_match:
            cycle_qs = qs.filter(
                Q(type_diplome__icontains=cycle_match) |
                Q(etudiant__niveau_etude__icontains=cycle_match)
            ).order_by('-date_demande')
            count = cycle_qs.count()
            nom_cycle = cycle_match.capitalize()
            reponse = f"🎓 **Demandes concernant les étudiants en {nom_cycle} : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(cycle_qs[:8])
            else:
                reponse += f"ℹ️ Aucune demande enregistrée actuellement pour le grade de {nom_cycle}."
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Combien de demandes de diplômes avons-nous reçues ?"]
            }

        # 4. Demandes par année universitaire précise (ex: 2024-2025 ou 2023-2024)
        annee_match = re.search(r'\b(20\d{2}[-/]20\d{2})\b', query) or re.search(r'\b(20\d{2})\b', query)
        if annee_match and ('annee' in query_norm or 'demande' in query_norm or 'obtention' in query_norm):
            target_annee = annee_match.group(1).replace('/', '-')
            demandes_annee = qs.filter(
                Q(annee_universitaire__icontains=target_annee) |
                Q(observations__icontains=target_annee) |
                Q(date_demande__year=target_annee[:4])
            ).order_by('-date_demande')
            count = demandes_annee.count()
            reponse = f"🗓️ **Demandes associées à l'année universitaire `{target_annee}` : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(demandes_annee[:8])
            else:
                reponse += f"ℹ️ Aucune demande trouvée pour l'année universitaire `{target_annee}`."
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Statistiques globales"]
            }

        # C. SUIVRE LES TRANSMISSIONS & HISTORIQUE
        # 1. Transmises au Chef de service
        if any(re.search(p, query_norm) for p in [
            r'transmise.*chef',
            r'deja.*transmise',
            r'demandes.*transmises'
        ]):
            transmises = qs.filter(
                Q(date_transmission_chef__isnull=False) |
                Q(statut__in=[
                    Statut.VALIDEE, Statut.EN_TRAITEMENT, Statut.EN_ATTENTE_IMPRESSION,
                    Statut.EN_IMPRESSION, Statut.IMPRIME, Statut.EN_TRANSMISSION_PRESIDENT,
                    Statut.EN_ATTENTE_SIGNATURE_PRESIDENT, Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE
                ])
            ).order_by('-date_demande')
            count = transmises.count()
            reponse = f"📤 **Demandes transmises au Chef de Service : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(transmises[:8])
            else:
                reponse += "ℹ️ Aucune demande n'a encore été transmise au Chef de Service."
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes n'ont pas encore été transmises ?", "Quelles demandes sont en attente de vérification ?"]
            }

        # 2. Non encore transmises
        if any(re.search(p, query_norm) for p in [
            r'pas encore.*transmise',
            r'non.*transmise',
            r'restent a transmettre'
        ]):
            non_transmises = qs.filter(
                statut__in=[Statut.EN_ATTENTE_VERIFICATION, Statut.DOSSIER_INCOMPLET]
            ).order_by('-date_demande')
            count = non_transmises.count()
            reponse = f"⏳ **Demandes non encore transmises au Chef de Service : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(non_transmises[:8])
                reponse += "\n👉 *Ces dossiers requièrent la validation d'admission par la Scolarité Centrale avant transmission.*"
            else:
                reponse += "✅ Tous les dossiers régularisés ont été transmis !"
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Quelles demandes ont déjà été transmises au chef de service ?"]
            }

        # 3. Demandes archivées / retirées / finalisées
        if any(re.search(p, query_norm) for p in [
            r'archivee',
            r'demandes archivees',
            r'retiree',
            r'finalisee',
            r'circuit.*acheve'
        ]):
            archivees = qs.filter(
                statut__in=[Statut.RETIRE, Statut.RETOUR_SCOLARITE, Statut.REFUSEE]
            ).order_by('-date_demande')
            count = archivees.count()
            reponse = f"🗄️ **Demandes archivées ou terminées : {count}**\n\n"
            if count > 0:
                reponse += cls._format_demandes_list(archivees[:8])
            else:
                reponse += "ℹ️ Aucun dossier archivé pour l'instant."
            return {
                "reply": reponse,
                "suggestions": ["Combien de demandes de diplômes avons-nous reçues ?", "Statistiques globales"]
            }

        # 4. Historique d'une demande
        if 'historique' in query_norm:
            ref_match = re.search(r'#?(\d+)', query)
            if ref_match:
                ref_id = int(ref_match.group(1))
                demande = qs.filter(id=ref_id).first()
                if demande:
                    historiques = demande.historique.select_related('utilisateur').order_by('date_action')
                    reponse = f"📜 **Historique d'audit du Dossier #{demande.id} ({demande.etudiant.nom} {demande.etudiant.prenom})** :\n\n"
                    if historiques.exists():
                        for h in historiques:
                            date_str = h.date_action.strftime('%d/%m/%Y à %H:%M')
                            user_str = f"{h.utilisateur.get_full_name() or h.utilisateur.username}" if h.utilisateur else "Système"
                            reponse += f"- **{date_str}** par **{user_str}** (`{h.role_utilisateur or 'Guichet'}`) :\n"
                            reponse += f"  ↳ *Action* : {h.action_realisee}\n"
                            if h.commentaire:
                                reponse += f"  ↳ *Commentaire* : « {h.commentaire} »\n"
                    else:
                        reponse += f"Dossier créé le {demande.date_demande.strftime('%d/%m/%Y')}. Aucun événement supplémentaire consigné."
                    return {
                        "reply": reponse,
                        "suggestions": [f"Recherche la demande #{demande.id}", "Quelles demandes sont en attente de vérification ?"]
                    }
                else:
                    return {
                        "reply": f"⚠️ Demande #{ref_id} introuvable dans votre périmètre.",
                        "suggestions": ["Quelles demandes sont en attente de vérification ?"]
                    }
            else:
                return {
                    "reply": "Pour consulter l'historique complet d'un dossier, veuillez préciser son numéro (ex : *« Donne-moi l'historique de la demande #1 »* ou *« Historique dossier #14 »*).",
                    "suggestions": ["Quelles demandes sont en attente de vérification ?", "Nouvelles demandes reçues aujourd'hui"]
                }

        # D. OBTENIR DES STATISTIQUES
        # 1. Validées ce mois-ci / Reçues ce mois-ci
        if any(k in query_norm for k in ['ce mois', 'mois-ci', 'du mois']):
            now = timezone.now()
            validees_mois = qs.filter(
                statut__in=[Statut.VALIDEE, Statut.EN_TRAITEMENT, Statut.IMPRIME, Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE],
                date_demande__year=now.year,
                date_demande__month=now.month
            ).count()
            recues_mois = qs.filter(
                date_demande__year=now.year,
                date_demande__month=now.month
            ).count()
            reponse = (
                f"📈 **Statistiques du mois en cours ({now.strftime('%B %Y')})** :\n\n"
                f"- **Demandes reçues** : **{recues_mois}**\n"
                f"- **Demandes validées / en cours** : **{validees_mois}**\n"
            )
            return {
                "reply": reponse,
                "suggestions": ["Combien de demandes restent à vérifier ?", "Combien de demandes ont été rejetées ?", "Quel est le nombre total de demandes reçues cette année ?"]
            }

        # 2. Nombre total de demandes reçues cette année
        if any(k in query_norm for k in ['cette annee', 'annee en cours', 'annuel']):
            now = timezone.now()
            total_annee = qs.filter(date_demande__year=now.year).count()
            reponse = (
                f"📅 **Nombre total de demandes reçues cette année ({now.year}) : {total_annee}**\n\n"
                f"Ce décompte comprend l'ensemble des dépôts enregistrés aux guichets de l'université depuis le 1er janvier {now.year}."
            )
            return {
                "reply": reponse,
                "suggestions": ["Combien de demandes restent à vérifier ?", "Combien de demandes de diplômes avons-nous reçues ?"]
            }

        # E. INFORMATIONS ACADÉMIQUES
        # 1. Année d'obtention du diplôme précédent vs diplôme demandé
        if any(k in query_norm for k in ['diplome precedent', 'diplome anterieur', 'precedent de cet etudiant']):
            return {
                "reply": (
                    "ℹ️ **Règle académique relative aux diplômes précédents** :\n\n"
                    "Conformément à la procédure officielle de l'Université de Toliara, seule l'**Année universitaire d'obtention du diplôme demandé** est saisie et certifiée (ex. : `2024-2025`).\n\n"
                    "L'année d'obtention du diplôme précédent (ex : Licence pour un Master demandé) n'est **pas consignée** dans le formulaire de la plateforme. Seule la conformité du PV et des relevés de notes du cursus est vérifiée physiquement au guichet."
                ),
                "suggestions": ["Quel diplôme l'étudiant demande-t-il ?", "Quelle est son année universitaire de référence ?"]
            }

        # 2. Quel diplôme l'étudiant demande-t-il ?
        if any(k in query_norm for k in ['quel diplome', 'diplome demande', 'titre vise']):
            ref_match = re.search(r'#?(\d+)', query)
            if ref_match:
                d = qs.filter(id=int(ref_match.group(1))).first()
                if d:
                    return {
                        "reply": f"🎓 **Dossier #{d.id} ({d.etudiant.nom} {d.etudiant.prenom})** :\n- **Diplôme demandé** : **{d.type_diplome}**\n- **Faculté / Mention** : {d.etudiant.faculte} · {d.etudiant.filiere}\n- **Année d'obtention** : `{d.annee_universitaire or '2024-2025'}`",
                        "suggestions": [f"L'admission de cet étudiant a-t-elle été vérifiée ?"]
                    }

        # 3. Quelle est son année universitaire de référence ?
        if any(k in query_norm for k in ['annee universitaire de reference', 'annee de reference', 'annee d\'obtention']):
            ref_match = re.search(r'#?(\d+)', query)
            if ref_match:
                d = qs.filter(id=int(ref_match.group(1))).first()
                if d:
                    annee = d.annee_universitaire or "2024-2025 (année par défaut)"
                    return {
                        "reply": f"🗓️ **Année universitaire de référence pour le dossier #{d.id} ({d.etudiant.nom} {d.etudiant.prenom})** : **{annee}**.",
                        "suggestions": [f"Quel diplôme l'étudiant demande-t-il ?"]
                    }

        # 4. L'admission de cet étudiant a-t-elle été vérifiée ?
        if any(k in query_norm for k in ['admission.*verifiee', 'admission de cet etudiant', 'est-il admis', 'est elle verifiee']):
            ref_match = re.search(r'#?(\d+)', query)
            if ref_match:
                d = qs.filter(id=int(ref_match.group(1))).first()
                if d:
                    if d.admission_etudiant is True:
                        admis_text = "✅ **OUI, ADMIS** — L'étudiant figure et a été certifié sur la liste officielle de délibération d'admission."
                    elif d.admission_etudiant is False:
                        admis_text = "❌ **NON ADMIS / AJOURNÉ** — L'étudiant n'a pas été validé par la commission d'admission."
                    else:
                        admis_text = "⏳ **EN ATTENTE** — Le contrôle d'admission n'a pas encore été finalisé par la Scolarité Centrale."

                    return {
                        "reply": (
                            f"📋 **Statut du contrôle d'admission pour le dossier #{d.id} ({d.etudiant.nom} {d.etudiant.prenom})** :\n\n"
                            f"{admis_text}\n\n"
                            f"- **Statut global du dossier** : `{d.get_statut_display()}`"
                        ),
                        "suggestions": [f"Donne-moi l'historique de la demande #{d.id}"]
                    }

        return None

    # =========================================================================
    # FORMATAGE STRUCTURÉ DES RÉPONSES
    # =========================================================================
    @classmethod
    def _format_demandes_list(cls, demandes_qs) -> str:
        lines = []
        for d in demandes_qs:
            annee = f" · Année `{d.annee_universitaire}`" if d.annee_universitaire else ""
            statut_badge = d.get_statut_display()
            lines.append(
                f"- **Dossier #{d.id}** : **{d.etudiant.nom} {d.etudiant.prenom}** (`{d.etudiant.matricule}`) — *{d.type_diplome}*{annee}\n"
                f"  📍 *{d.etablissement_origine or d.etudiant.faculte}* · Statut : **{statut_badge}**"
            )
        return "\n".join(lines) + "\n"

    @classmethod
    def _format_fiche_complete(cls, d: DemandeDiplome) -> str:
        pieces_status = []
        if d.has_pv_soutenance: pieces_status.append("PV soutenance")
        if d.has_releve_notes: pieces_status.append("Relevé officiel")
        if d.has_certificat_scolarite: pieces_status.append("Certificat scolarité")
        if d.has_recu_bancaire: pieces_status.append("Reçu bancaire")

        if d.admission_etudiant is True:
            admis_str = "Admis sur liste officielle ✅"
        elif d.admission_etudiant is False:
            admis_str = "Non admis ❌"
        else:
            admis_str = "En attente de vérification ⏳"

        fiche = (
            f"📋 **Fiche Détaillée — Demande #{d.id}**\n\n"
            f"👤 **Étudiant** : **{d.etudiant.nom} {d.etudiant.prenom}**\n"
            f"- **Matricule** : `{d.etudiant.matricule}` | **CIN** : `{d.etudiant.cin}`\n"
            f"- **Faculté / Domaine** : {d.etudiant.faculte}\n"
            f"- **Filière & Cycle** : {d.etudiant.filiere} ({d.etudiant.niveau_etude})\n\n"
            f"🎓 **Diplôme visé** : **{d.type_diplome}**\n"
            f"- **Année d'obtention** : `{d.annee_universitaire or '2024-2025'}`\n"
            f"- **Établissement d'origine** : {d.etablissement_origine or d.etudiant.faculte}\n"
            f"- **Date de dépôt** : {d.date_demande.strftime('%d/%m/%Y à %H:%M')}\n\n"
            f"🛡️ **Statut & Conformité** :\n"
            f"- **Statut actuel** : **{d.get_statut_display()}**\n"
            f"- **Admission officielle** : {admis_str}\n"
            f"- **Pièces conformes** : {', '.join(pieces_status) if pieces_status else 'Aucune pièce cochée'}\n"
        )

        if hasattr(d, 'diplome') and d.diplome:
            fiche += (
                f"\n📜 **Titre Officiel Délivré** :\n"
                f"- **N° de diplôme** : `{d.diplome.numero_diplome}`\n"
                f"- **Code anti-fraude** : `{d.diplome.code_verification}`\n"
                f"- **Mention** : {d.diplome.mention or 'Non précisée'}\n"
            )

        if d.observations:
            fiche += f"\n📝 **Observations** : « {d.observations} »\n"

        return fiche

    # =========================================================================
    # GESTION PAR RÔLE SPÉCIFIQUE
    # =========================================================================
    @classmethod
    def _handle_scolarite_etablissement(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        base_qs = cls.get_base_queryset(user)
        incomplets_count = base_qs.filter(statut=Statut.DOSSIER_INCOMPLET).count()
        en_cours_count = base_qs.exclude(statut=Statut.REFUSEE).count()

        if any(w in query_lower for w in ['incomplet', 'a completer', 'pieces', 'manquante']):
            dossiers = base_qs.filter(statut=Statut.DOSSIER_INCOMPLET).select_related('etudiant')[:5]
            reponse = f"⚠️ **Dossiers nécessitant un complément de pièces : {incomplets_count}**\n\n"
            if incomplets_count > 0:
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Ouvrez le dossier dans votre tableau de bord pour téléverser les pièces et cliquer sur *« Compléter le dossier »*."
            else:
                reponse += "✅ Aucun dossier incomplet pour votre établissement."
            return {
                "reply": reponse,
                "suggestions": ["Dossiers incomplets à régulariser", "Pièces obligatoires d'un dossier", "Combien de demandes au total ?"]
            }

        if any(w in query_lower for w in ['piece', 'obligatoire', 'depot', 'dossier', 'document']):
            return {
                "reply": (
                    "📄 **Pièces constitutives du dossier physique à vérifier lors du dépôt** :\n\n"
                    "1. **PV de soutenance certifié** (validé par le jury)\n"
                    "2. **Relevé de notes officiel** complet du cursus\n"
                    "3. **Certificat de scolarité** de l'année concernée\n"
                    "4. **Reçu / Bordereau bancaire** justifiant le règlement des droits de diplôme."
                ),
                "suggestions": ["Enregistrer un nouveau dossier", "Dossiers incomplets", "Suivi des demandes"]
            }

        return {
            "reply": (
                f"Bonjour **Scolarité de l'établissement** ({user.etablissement or user.username}).\n\n"
                f"- **{incomplets_count} dossier(s) incomplet(s)** à régulariser.\n"
                f"- **{en_cours_count} demande(s)** présentes dans le circuit de traitement."
            ),
            "suggestions": ["Dossiers incomplets", "Pièces obligatoires d'un dossier", "Combien de demandes au total ?"]
        }

    @classmethod
    def _handle_scolarite_centrale(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        qs = cls.get_base_queryset(user)
        a_verifier_count = qs.filter(statut=Statut.EN_ATTENTE_VERIFICATION).count()

        if any(w in query_lower for w in ['faculte', 'etablissement', 'repartition']):
            facs = qs.values('etudiant__faculte').annotate(count=Count('id')).order_by('-count')
            reponse = "📊 **Répartition globale des demandes par Faculté / Institut** :\n\n"
            for f in facs:
                reponse += f"- **{f['etudiant__faculte'] or 'Non spécifié'}** : {f['count']} dossier(s)\n"
            return {
                "reply": reponse,
                "suggestions": ["Quelles demandes sont en attente de vérification ?", "Combien de demandes de diplômes avons-nous reçues ?"]
            }

        return {
            "reply": f"Bonjour **Scolarité Centrale** ({user.username}). Vous avez **{a_verifier_count} demande(s) en attente de vérification d'admission**.",
            "suggestions": cls.get_suggestions_for_role(user.role)
        }

    @classmethod
    def _handle_chef_service(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        qs = cls.get_base_queryset(user)
        validees_count = qs.filter(statut=Statut.VALIDEE).count()
        en_traitement_count = qs.filter(statut=Statut.EN_TRAITEMENT).count()
        imprimees_count = qs.filter(statut=Statut.IMPRIME).count()

        if any(w in query_lower for w in ['a affecter', 'a traiter', 'validee', 'imprimeur', 'affecter']):
            dossiers = qs.filter(statut__in=[Statut.VALIDEE, Statut.EN_TRAITEMENT]).select_related('etudiant')[:5]
            reponse = f"⚙️ **Dossiers validés à affecter pour impression : {validees_count + en_traitement_count}**\n\n"
            if dossiers.exists():
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Sélectionnez le dossier et choisissez l'imprimeur désigné pour lancer la préparation."
            else:
                reponse += "✅ Aucun dossier en attente d'affectation."
            return {
                "reply": reponse,
                "suggestions": ["Diplômes imprimés à faire signer", "Diplômes prêts pour transmission Présidence"]
            }

        if any(w in query_lower for w in ['transmission', 'agent', 'acheminer', 'president']):
            dossiers = qs.filter(statut=Statut.IMPRIME).select_related('etudiant')[:5]
            reponse = f"🚚 **Diplômes imprimés prêts pour transmission à la Présidence : {imprimees_count}**\n\n"
            if imprimees_count > 0:
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Confiez chaque diplôme à un agent de transmission depuis le tableau de bord."
            else:
                reponse += "✅ Aucun diplôme en attente de transmission vers la Présidence."
            return {
                "reply": reponse,
                "suggestions": ["Dossiers à affecter pour impression", "Diplômes prêts pour transmission Présidence"]
            }

        return {
            "reply": (
                f"Bonjour **Chef de Service des Diplômes** ({user.username}).\n\n"
                f"- **{validees_count + en_traitement_count} dossier(s)** prêts pour affectation à un imprimeur.\n"
                f"- **{imprimees_count} diplôme(s)** imprimé(s) à confier aux agents de transmission."
            ),
            "suggestions": cls.get_suggestions_for_role(user.role)
        }

    @classmethod
    def _handle_imprimeur(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        my_assigned = cls.get_base_queryset(user).filter(
            statut__in=[Statut.EN_ATTENTE_IMPRESSION, Statut.EN_IMPRESSION]
        )
        a_imprimer_count = my_assigned.count()
        dernier_diplome = Diplome.objects.order_by('-date_creation').first()

        if any(w in query_lower for w in ['a imprimer', 'file', 'attente', 'combien', 'tirage']):
            dossiers = my_assigned.select_related('etudiant')[:5]
            reponse = f"🖨️ **File d'impression active : {a_imprimer_count} diplôme(s)**\n\n"
            if a_imprimer_count > 0:
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Lors de la fin de tirage, cliquez sur *« Déclarer impression terminée »* pour générer le numéro officiel séquentiel `UT-YYYY-NNNNN`."
            else:
                reponse += "✅ Aucun diplôme en attente de tirage dans votre file."
            return {
                "reply": reponse,
                "suggestions": ["Règles de numérotation officielle", "Dernier numéro de diplôme attribué"]
            }

        if any(w in query_lower for w in ['numerotation', 'numero', 'anti-fraude', 'code', 'format']):
            return {
                "reply": (
                    "🔒 **Numérotation et Sécurité anti-fraude des diplômes** :\n\n"
                    f"1. **Numéro séquentiel officiel** : Format `UT-AAAA-NNNNN` (ex: `UT-{timezone.now().year}-00042`), unique et chronologique.\n"
                    "2. **Code de vérification cryptographique** : Chaîne hexadécimale unique de 8 caractères générée par le système.\n"
                    f"3. **Dernier numéro attribué** : `{dernier_diplome.numero_diplome if dernier_diplome else 'Aucun'}`"
                ),
                "suggestions": ["File d'impression active", "Procédure de tirage sécurisé"]
            }

        return {
            "reply": f"Bonjour **Concepteur / Imprimeur** ({user.username}). Vous avez **{a_imprimer_count} diplôme(s) prêt(s) pour impression**.",
            "suggestions": cls.get_suggestions_for_role(user.role)
        }

    @classmethod
    def _handle_agent_transmission(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        qs = cls.get_base_queryset(user)
        a_transmettre_pres = qs.filter(statut=Statut.EN_TRANSMISSION_PRESIDENT).count()
        a_retourner_scol = qs.filter(statut=Statut.SIGNE_PRESIDENT).count()

        if any(w in query_lower for w in ['transmettre', 'acheminer', 'president', 'presidence', 'aller']):
            dossiers = qs.filter(statut=Statut.EN_TRANSMISSION_PRESIDENT).select_related('etudiant')[:5]
            reponse = f"🏛️ **Diplômes à acheminer vers la Présidence : {a_transmettre_pres}**\n\n"
            if a_transmettre_pres > 0:
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Une fois déposés au secrétariat de la Présidence, cliquez sur *« Enregistrer la remise Présidence »*."
            else:
                reponse += "✅ Aucun diplôme en cours d'acheminement vers la Présidence."
            return {
                "reply": reponse,
                "suggestions": ["Diplômes signés à ramener à la scolarité", "Consignes de transmission sécurisée"]
            }

        if any(w in query_lower for w in ['retour', 'ramener', 'scolarite', 'signe']):
            dossiers = qs.filter(statut=Statut.SIGNE_PRESIDENT).select_related('etudiant')[:5]
            reponse = f"📦 **Diplômes signés par le Président à ramener à la scolarité : {a_retourner_scol}**\n\n"
            if a_retourner_scol > 0:
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Après acheminement et remise au Chef de Service ou à la scolarité, enregistrez l'action de retour."
            else:
                reponse += "✅ Aucun diplôme en attente de retour."
            return {
                "reply": reponse,
                "suggestions": ["Diplômes à acheminer vers la Présidence", "Consignes de transmission sécurisée"]
            }

        return {
            "reply": (
                f"Bonjour **Agent de Transmission** ({user.username}).\n\n"
                f"- **{a_transmettre_pres} diplôme(s)** à acheminer vers la Présidence.\n"
                f"- **{a_retourner_scol} diplôme(s) signés** à ramener à la scolarité."
            ),
            "suggestions": cls.get_suggestions_for_role(user.role)
        }

    @classmethod
    def _handle_presidence(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        qs = cls.get_base_queryset(user)
        a_signer_count = qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).count()
        total_signes = qs.filter(statut__in=[Statut.SIGNE_PRESIDENT, Statut.RETOUR_SCOLARITE]).count()

        demandes_sig = qs.filter(date_signature_president__isnull=False)
        total_time_seconds = 0
        c = 0
        for d in demandes_sig:
            diff = d.date_signature_president - d.date_demande
            total_time_seconds += diff.total_seconds()
            c += 1
        avg_days = round((total_time_seconds / c) / (3600 * 24), 1) if c > 0 else 0

        if any(w in query_lower for w in ['a signer', 'signer', 'signature', 'attente']):
            dossiers = qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).select_related('etudiant')[:5]
            reponse = f"✍️ **Diplômes en attente de votre signature officielle : {a_signer_count}**\n\n"
            if a_signer_count > 0:
                reponse += cls._format_demandes_list(dossiers)
                reponse += "\n👉 Lors de la signature, vous pouvez consigner la mention d'excellence académique."
            else:
                reponse += "✅ Aucun diplôme en attente de votre signature."
            return {
                "reply": reponse,
                "suggestions": ["Indicateurs de performance (KPI)", "Délai moyen de délivrance"]
            }

        if any(w in query_lower for w in ['kpi', 'statistique', 'delai', 'moyen', 'rapport', 'performance']):
            reponse = (
                f"🏛️ **Tableau de Bord Exécutif - Présidence de l'Université de Toliara** :\n\n"
                f"- **Diplômes actuellement en attente de signature** : **{a_signer_count}**\n"
                f"- **Diplômes signés par le Président** : **{total_signes}**\n"
                f"- **Délai moyen de délivrance de bout en bout** : **{avg_days} jour(s)**\n\n"
                f"📈 Le flux de traitement administratif est sous contrôle."
            )
            return {
                "reply": reponse,
                "suggestions": ["Diplômes en attente de ma signature", "Délai moyen de délivrance"]
            }

        return {
            "reply": (
                f"Bonjour **Monsieur le Président de l'Université** ({user.username}).\n\n"
                f"- **{a_signer_count} diplôme(s)** sont en attente de votre signature officielle.\n"
                f"- **{total_signes} diplôme(s)** ont été signés (Délai moyen jusqu'à signature : **{avg_days} jours**)."
            ),
            "suggestions": cls.get_suggestions_for_role(user.role)
        }

    # =========================================================================
    # SUGGESTIONS DE QUESTIONS SELON LE RÔLE
    # =========================================================================
    @classmethod
    def get_suggestions_for_role(cls, role: str) -> list:
        if role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT:
            return [
                "Dossiers incomplets à régulariser",
                "Pièces obligatoires d'un dossier",
                "Combien de demandes au total ?",
                "Nouvelles demandes reçues aujourd'hui"
            ]
        elif role == Utilisateur.Role.SCOLARITE_CENTRALE:
            return [
                "Quelles demandes sont en attente de vérification ?",
                "Combien de demandes de diplômes avons-nous reçues ?",
                "Nouvelles demandes reçues aujourd'hui",
                "Affiche-moi toutes les demandes validées",
                "Quelles demandes ont été rejetées ?",
                "Quelles demandes ont déjà été transmises au chef de service ?",
                "Combien de demandes ont été validées ce mois-ci ?",
                "Quelle est l'année d'obtention du diplôme précédent de cet étudiant ?"
            ]
        elif role == Utilisateur.Role.CHEF_SERVICE:
            return [
                "Dossiers à affecter pour impression",
                "Diplômes prêts pour transmission Présidence",
                "Combien de demandes de diplômes avons-nous reçues ?",
                "Vue globale du circuit"
            ]
        elif role == Utilisateur.Role.IMPRIMEUR:
            return [
                "File d'impression active",
                "Règles de numérotation officielle",
                "Dernier numéro de diplôme attribué"
            ]
        elif role == Utilisateur.Role.AGENT_TRANSMISSION:
            return [
                "Diplômes à acheminer à la Présidence",
                "Diplômes signés à ramener à la scolarité",
                "Que signifie RETOUR_SCOLARITE ?"
            ]
        elif role == Utilisateur.Role.PRESIDENCE:
            return [
                "Diplômes en attente de ma signature",
                "Consulter les indicateurs KPI exécutifs",
                "Délai moyen jusqu'à la signature"
            ]
        return []
