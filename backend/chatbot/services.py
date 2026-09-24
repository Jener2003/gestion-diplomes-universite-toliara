import re
import unicodedata
from datetime import datetime
from django.utils import timezone
from django.db.models import Count, Avg, Q

from demandes.models import DemandeDiplome, Historique
from utilisateurs.models import Utilisateur, Etudiant
from diplomes.models import Diplome
from notifications.models import Notification

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
    'EN_ATTENTE_SIGNATURE_ETABLISSEMENT': "Le diplôme imprimé est transmis à la Scolarité de l'établissement pour recueil de la signature officielle du Doyen ou du Directeur.",
    'SIGNE_ETABLISSEMENT': "Le Doyen ou Directeur d'établissement a apposé sa signature et son sceau sur le diplôme.",
    'EN_TRANSMISSION_PRESIDENT': "Le diplôme est confié aux agents de transmission pour acheminement physique sécurisé vers la Présidence de l'Université.",
    'EN_ATTENTE_SIGNATURE_PRESIDENT': "Le diplôme est déposé au secrétariat de la Présidence, en attente de signature par Monsieur le Président de l'Université.",
    'SIGNE_PRESIDENT': "Le Président de l'Université a officiellement signé le diplôme et validé la mention attribuée.",
    'RETOUR_SCOLARITE': "L'agent de transmission achemine le diplôme signé en retour vers le service des diplômes et la scolarité de l'établissement.",
    'DISPONIBLE': "Le diplôme est arrivé à la scolarité de l'établissement et est prêt pour remise en main propre à l'étudiant.",
    'RETIRE': "Le diplôme a été officiellement remis à l'étudiant ou son mandataire légal avec émargement du registre de délivrance."
}


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.lower()


class ChatbotSecurityService:
    """
    Service d'assistance conversationnelle basé sur l'IA pour les 6 rôles administratifs.
    Assure un cloisonnement strict des compétences et des données selon le rôle connecté.
    """

    @classmethod
    def process_message(cls, user: Utilisateur, message: str) -> dict:
        query = message.strip()
        if not query:
            return {
                "reply": f"Bonjour **{user.first_name or user.username}** ({user.get_role_display()}) ! En quoi puis-je vous assister aujourd'hui dans vos fonctions administratives ?",
                "suggestions": cls.get_suggestions_for_role(user.role)
            }

        role = user.role
        query_norm = normalize_text(query)

        # ── Réponse transversale : Explication d'un statut ─────────────────────
        for statut_code, explic in EXPLICATIONS_STATUTS.items():
            statut_norm = normalize_text(statut_code)
            if statut_norm in query_norm or normalize_text(statut_code.replace('_', ' ')) in query_norm:
                return {
                    "reply": f"ℹ️ **Explication du statut `{statut_code}`** :\n\n{explic}",
                    "suggestions": cls.get_suggestions_for_role(user.role)
                }

        # ── 1. SCOLARITÉ ÉTABLISSEMENT ─────────────────────────────────────────
        if role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT:
            return cls._handle_scolarite_etablissement(user, query, query_norm)

        # ── 2. SCOLARITÉ CENTRALE ──────────────────────────────────────────────
        elif role == Utilisateur.Role.SCOLARITE_CENTRALE:
            return cls._handle_scolarite_centrale(user, query, query_norm)

        # ── 3. CHEF DE SERVICE DES DIPLÔMES ────────────────────────────────────
        elif role == Utilisateur.Role.CHEF_SERVICE:
            return cls._handle_chef_service(user, query, query_norm)

        # ── 4. CONCEPTEUR / IMPRIMEUR ──────────────────────────────────────────
        elif role == Utilisateur.Role.IMPRIMEUR:
            return cls._handle_imprimeur(user, query, query_norm)

        # ── 5. AGENT DE TRANSMISSION ───────────────────────────────────────────
        elif role == Utilisateur.Role.AGENT_TRANSMISSION:
            return cls._handle_agent_transmission(user, query, query_norm)

        # ── 6. PRÉSIDENCE DE L'UNIVERSITÉ ──────────────────────────────────────
        elif role == Utilisateur.Role.PRESIDENCE:
            return cls._handle_presidence(user, query, query_norm)

        else:
            return {
                "reply": "Votre profil ne dispose pas d'un rôle administratif habilité sur cet intranet.",
                "suggestions": []
            }

    # =========================================================================
    # 1. SCOLARITÉ ÉTABLISSEMENT
    # =========================================================================
    @classmethod
    def _handle_scolarite_etablissement(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        base_qs = DemandeDiplome.objects.all()
        if user.etablissement:
            base_qs = base_qs.filter(
                Q(etudiant__faculte__icontains=user.etablissement) |
                Q(etablissement_origine__icontains=user.etablissement)
            )

        incomplets_count = base_qs.filter(statut=Statut.DOSSIER_INCOMPLET).count()
        a_signer_etab_count = base_qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_ETABLISSEMENT).count()
        disponibles_count = base_qs.filter(statut=Statut.DISPONIBLE).count()

        if any(w in query_lower for w in ['incomplet', 'a completer', 'pieces', 'manquante']):
            dossiers = base_qs.filter(statut=Statut.DOSSIER_INCOMPLET).select_related('etudiant')[:5]
            reponse = f"⚠️ **Dossiers nécessitant un complément de pièces : {incomplets_count}**\n\n"
            if incomplets_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *Motif : {d.observations or 'Pièces non conformes'}*\n"
                reponse += "\n👉 Ouvrez le dossier dans votre tableau de bord pour téléverser les pièces et cliquer sur *« Compléter le dossier »*."
            else:
                reponse += "✅ Aucun dossier incomplet pour votre établissement."
            return {
                "reply": reponse,
                "suggestions": ["Diplômes à faire signer par le Doyen", "Diplômes disponibles pour retrait", "Pièces obligatoires d'un dossier"]
            }

        if any(w in query_lower for w in ['doyen', 'directeur', 'signature etab', 'signer etab']):
            dossiers = base_qs.filter(statut=Statut.EN_ATTENTE_SIGNATURE_ETABLISSEMENT).select_related('etudiant')[:5]
            reponse = f"✍️ **Diplômes imprimés en attente de signature Doyen/Directeur : {a_signer_etab_count}**\n\n"
            if a_signer_etab_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}*\n"
                reponse += "\n👉 Après recueil de la signature, enregistrez l'action pour transmission au Chef de Service."
            else:
                reponse += "✅ Aucun diplôme en attente de signature Doyen."
            return {
                "reply": reponse,
                "suggestions": ["Dossiers incomplets à régulariser", "Diplômes prêts pour retrait", "Enregistrer un nouveau dossier"]
            }

        if any(w in query_lower for w in ['disponible', 'retrait', 'remise', 'pret', 'guichet']):
            dossiers = base_qs.filter(statut=Statut.DISPONIBLE).select_related('etudiant')[:5]
            reponse = f"🎓 **Diplômes disponibles pour retrait au guichet : {disponibles_count}**\n\n"
            if disponibles_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}*\n"
                reponse += "\n👉 Lors de la remise à l'étudiant, cliquez sur *« Enregistrer le retrait »* en saisissant son identité."
            else:
                reponse += "✅ Aucun diplôme en attente de retrait."
            return {
                "reply": reponse,
                "suggestions": ["Dossiers incomplets", "Diplômes à faire signer par le Doyen", "Pièces obligatoires d'un dossier"]
            }

        if any(w in query_lower for w in ['piece', 'obligatoire', 'depot', 'dossier', 'document']):
            return {
                "reply": (
                    "📄 **Pièces constitutives du dossier physique à vérifier lors du dépôt** :\n\n"
                    "1. **PV de soutenance** (validé par le jury)\n"
                    "2. **Relevé de notes** complet du cursus\n"
                    "3. **Certificat de scolarité** de l'année concernée\n"
                    "4. **Reçu / Bordereau bancaire** justifiant le règlement des droits de diplôme."
                ),
                "suggestions": ["Enregistrer un nouveau dossier", "Dossiers incomplets", "Diplômes disponibles"]
            }

        return {
            "reply": (
                f"Bonjour **Scolarité de l'établissement** ({user.etablissement or user.username}).\n\n"
                f"- **{incomplets_count} dossier(s) incomplet(s)** à régulariser.\n"
                f"- **{a_signer_etab_count} diplôme(s)** à faire signer par le Doyen/Directeur.\n"
                f"- **{disponibles_count} diplôme(s)** prêts pour remise aux étudiants."
            ),
            "suggestions": ["Dossiers incomplets", "Diplômes à faire signer par le Doyen", "Diplômes disponibles pour retrait"]
        }

    # =========================================================================
    # 2. SCOLARITÉ CENTRALE
    # =========================================================================
    @classmethod
    def _handle_scolarite_centrale(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        a_verifier_count = DemandeDiplome.objects.filter(statut=Statut.EN_ATTENTE_VERIFICATION).count()
        validees_count = DemandeDiplome.objects.filter(statut=Statut.VALIDEE).count()

        if any(w in query_lower for w in ['attente', 'a verifier', 'verifier', 'combien', 'nouvelles', 'recues']):
            dossiers = DemandeDiplome.objects.filter(statut=Statut.EN_ATTENTE_VERIFICATION).select_related('etudiant')[:5]
            reponse = f"📋 **Demandes en attente de vérification d'admission : {a_verifier_count}**\n\n"
            if a_verifier_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}* ({d.etablissement_origine})\n"
                reponse += "\n👉 Vérifiez que l'étudiant figure bien sur les listes officielles d'admission avant de cliquer sur *« Valider »*."
            else:
                reponse += "✅ Toutes les demandes reçues ont été vérifiées !"
            return {
                "reply": reponse,
                "suggestions": ["Procédure de contrôle académique", "Répartition par établissement", "Motifs de mise en incomplet"]
            }

        if any(w in query_lower for w in ['faculte', 'etablissement', 'repartition', 'statistique']):
            facs = DemandeDiplome.objects.values('etudiant__faculte').annotate(count=Count('id')).order_by('-count')
            reponse = "📊 **Répartition globale des demandes par Faculté / Institut** :\n\n"
            for f in facs:
                reponse += f"- **{f['etudiant__faculte'] or 'Non spécifié'}** : {f['count']} dossier(s)\n"
            return {
                "reply": reponse,
                "suggestions": ["Demandes en attente de vérification", "Règles de validation d'admission"]
            }

        return {
            "reply": f"Bonjour **Scolarité Centrale** ({user.username}). Vous avez **{a_verifier_count} demande(s) en attente de vérification d'admission**.",
            "suggestions": ["Demandes en attente de vérification", "Répartition par établissement", "Procédure de contrôle académique"]
        }

    # =========================================================================
    # 3. CHEF DE SERVICE DES DIPLÔMES
    # =========================================================================
    @classmethod
    def _handle_chef_service(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        validees_count = DemandeDiplome.objects.filter(statut=Statut.VALIDEE).count()
        en_traitement_count = DemandeDiplome.objects.filter(statut=Statut.EN_TRAITEMENT).count()
        imprimees_count = DemandeDiplome.objects.filter(statut=Statut.IMPRIME).count()
        signees_etab_count = DemandeDiplome.objects.filter(statut=Statut.SIGNE_ETABLISSEMENT).count()

        if any(w in query_lower for w in ['a affecter', 'a traiter', 'validee', 'imprimeur', 'affecter']):
            dossiers = DemandeDiplome.objects.filter(statut__in=[Statut.VALIDEE, Statut.EN_TRAITEMENT]).select_related('etudiant')[:5]
            reponse = f"⚙️ **Dossiers validés à affecter pour impression : {validees_count + en_traitement_count}**\n\n"
            if dossiers.exists():
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}*\n"
                reponse += "\n👉 Sélectionnez le dossier et choisissez l'imprimeur désigné pour lancer la préparation."
            else:
                reponse += "✅ Aucun dossier en attente d'affectation."
            return {
                "reply": reponse,
                "suggestions": ["Diplômes imprimés à faire signer", "Diplômes à confier aux agents de transmission", "Vue d'ensemble du circuit"]
            }

        if any(w in query_lower for w in ['transmission', 'agent', 'acheminer', 'president']):
            dossiers = DemandeDiplome.objects.filter(statut=Statut.SIGNE_ETABLISSEMENT).select_related('etudiant')[:5]
            reponse = f"🚚 **Diplômes signés par l'établissement prêts pour transmission Présidence : {signees_etab_count}**\n\n"
            if signees_etab_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}*\n"
                reponse += "\n👉 Cliquez sur *« Confier à l'agent de transmission »* pour débuter la navette."
            else:
                reponse += "✅ Aucun diplôme en attente de transmission vers la Présidence."
            return {
                "reply": reponse,
                "suggestions": ["Dossiers à affecter à l'imprimeur", "Diplômes imprimés à envoyer à l'établissement"]
            }

        return {
            "reply": (
                f"Bonjour **Chef de Service des Diplômes** ({user.username}).\n\n"
                f"- **{validees_count + en_traitement_count} dossier(s)** prêts pour affectation à un imprimeur.\n"
                f"- **{imprimees_count} diplôme(s) imprimé(s)** à transmettre pour signature Doyen.\n"
                f"- **{signees_etab_count} diplôme(s)** prêts pour transmission à la Présidence."
            ),
            "suggestions": ["Dossiers à affecter pour impression", "Diplômes prêts pour transmission Présidence", "Vue globale du circuit"]
        }

    # =========================================================================
    # 4. CONCEPTEUR / IMPRIMEUR
    # =========================================================================
    @classmethod
    def _handle_imprimeur(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        my_assigned = DemandeDiplome.objects.filter(
            Q(imprimeur_assigne=user) | Q(imprimeur_assigne__isnull=True),
            statut__in=[Statut.EN_ATTENTE_IMPRESSION, Statut.EN_IMPRESSION]
        )
        a_imprimer_count = my_assigned.count()
        deja_imprimes_count = DemandeDiplome.objects.filter(statut__in=[Statut.IMPRIME, Statut.EN_ATTENTE_SIGNATURE_ETABLISSEMENT, Statut.SIGNE_ETABLISSEMENT, Statut.SIGNE_PRESIDENT, Statut.DISPONIBLE, Statut.RETIRE]).count()
        dernier_diplome = Diplome.objects.order_by('-date_creation').first()

        if any(w in query_lower for w in ['a imprimer', 'file', 'attente', 'combien', 'tirage']):
            dossiers = my_assigned.select_related('etudiant')[:5]
            reponse = f"🖨️ **File d'impression active : {a_imprimer_count} diplôme(s)**\n\n"
            if a_imprimer_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}* ({d.etudiant.faculte})\n"
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
            "suggestions": ["File d'impression active", "Règles de numérotation officielle", "Dernier numéro de diplôme attribué"]
        }

    # =========================================================================
    # 5. AGENT DE TRANSMISSION
    # =========================================================================
    @classmethod
    def _handle_agent_transmission(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        a_transmettre_pres = DemandeDiplome.objects.filter(statut=Statut.EN_TRANSMISSION_PRESIDENT).count()
        a_retourner_scol = DemandeDiplome.objects.filter(statut=Statut.SIGNE_PRESIDENT).count()

        if any(w in query_lower for w in ['transmettre', 'acheminer', 'president', 'presidence', 'aller']):
            dossiers = DemandeDiplome.objects.filter(statut=Statut.EN_TRANSMISSION_PRESIDENT).select_related('etudiant')[:5]
            reponse = f"🏛️ **Diplômes à acheminer vers la Présidence : {a_transmettre_pres}**\n\n"
            if a_transmettre_pres > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}*\n"
                reponse += "\n👉 Une fois déposés au secrétariat de la Présidence, cliquez sur *« Enregistrer la remise Présidence »*."
            else:
                reponse += "✅ Aucun diplôme en cours d'acheminement vers la Présidence."
            return {
                "reply": reponse,
                "suggestions": ["Diplômes signés à ramener à la scolarité", "Consignes de transmission sécurisée"]
            }

        if any(w in query_lower for w in ['retour', 'ramener', 'scolarite', 'signe']):
            dossiers = DemandeDiplome.objects.filter(statut=Statut.SIGNE_PRESIDENT).select_related('etudiant')[:5]
            reponse = f"📦 **Diplômes signés par le Président à ramener à la scolarité : {a_retourner_scol}**\n\n"
            if a_retourner_scol > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}*\n"
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
            "suggestions": ["Diplômes à acheminer à la Présidence", "Diplômes signés à ramener à la scolarité"]
        }

    # =========================================================================
    # 6. PRÉSIDENCE DE L'UNIVERSITÉ
    # =========================================================================
    @classmethod
    def _handle_presidence(cls, user: Utilisateur, query: str, query_lower: str) -> dict:
        a_signer_count = DemandeDiplome.objects.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).count()
        total_delivres = DemandeDiplome.objects.filter(statut__in=[Statut.DISPONIBLE, Statut.RETIRE]).count()

        # Calcul du délai moyen de traitement global
        demandes_livrees = DemandeDiplome.objects.filter(statut__in=[Statut.DISPONIBLE, Statut.RETIRE], date_disponibilite__isnull=False)
        total_time_seconds = 0
        c = 0
        for d in demandes_livrees:
            diff = d.date_disponibilite - d.date_demande
            total_time_seconds += diff.total_seconds()
            c += 1
        avg_days = round((total_time_seconds / c) / (3600 * 24), 1) if c > 0 else 0

        if any(w in query_lower for w in ['a signer', 'signer', 'signature', 'attente']):
            dossiers = DemandeDiplome.objects.filter(statut=Statut.EN_ATTENTE_SIGNATURE_PRESIDENT).select_related('etudiant')[:5]
            reponse = f"✍️ **Diplômes en attente de votre signature officielle : {a_signer_count}**\n\n"
            if a_signer_count > 0:
                for d in dossiers:
                    reponse += f"- **Dossier #{d.id}** : {d.etudiant.nom} {d.etudiant.prenom} (`{d.etudiant.matricule}`) — *{d.type_diplome}* ({d.etudiant.faculte})\n"
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
                f"- **Total diplômes délivrés / disponibles** : **{total_delivres}**\n"
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
                f"- **{total_delivres} diplôme(s)** ont été délivrés (Délai moyen global : **{avg_days} jours**)."
            ),
            "suggestions": ["Diplômes en attente de ma signature", "Consulter les indicateurs KPI exécutifs", "Délai moyen de délivrance"]
        }

    # =========================================================================
    # SUGGESTIONS DE QUESTIONS SELON LE RÔLE
    # =========================================================================
    @classmethod
    def get_suggestions_for_role(cls, role: str) -> list:
        if role == Utilisateur.Role.SCOLARITE_ETABLISSEMENT:
            return [
                "Dossiers incomplets à régulariser",
                "Diplômes à faire signer par le Doyen",
                "Diplômes disponibles pour retrait",
                "Pièces obligatoires d'un dossier"
            ]
        elif role == Utilisateur.Role.SCOLARITE_CENTRALE:
            return [
                "Demandes en attente de vérification",
                "Répartition des demandes par établissement",
                "Procédure de contrôle académique",
                "Que signifie DOSSIER_INCOMPLET ?"
            ]
        elif role == Utilisateur.Role.CHEF_SERVICE:
            return [
                "Dossiers à affecter pour impression",
                "Diplômes prêts pour transmission Présidence",
                "Vue globale du circuit",
                "Que signifie EN_TRANSMISSION_PRESIDENT ?"
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
                "Délai moyen de délivrance"
            ]
        return []
