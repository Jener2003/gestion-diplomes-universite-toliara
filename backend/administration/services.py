import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .models import AdresseNotificationEquipe, JournalActivite

logger = logging.getLogger(__name__)

# Toute clé de détail contenant l'un de ces fragments est écartée avant enregistrement
FRAGMENTS_SENSIBLES = ('password', 'mot_de_passe', 'motdepasse', 'code', 'otp', 'token', 'jeton', 'secret')


def _details_sans_secret(details):
    return {
        cle: valeur for cle, valeur in (details or {}).items()
        if not any(fragment in cle.lower() for fragment in FRAGMENTS_SENSIBLES)
    }


def adresse_ip(request):
    # REMOTE_ADDR uniquement : X-Forwarded-For est falsifiable sans proxy de confiance
    if request is None:
        return None
    return request.META.get('REMOTE_ADDR') or None


def journaliser(operation, *, auteur=None, cible=None, request=None, details=None):
    """Ajoute une entrée au journal d'activité (jamais de mot de passe, d'OTP ni de jeton)."""
    if auteur is not None and not getattr(auteur, 'is_authenticated', True):
        auteur = None
    if operation in JournalActivite.OPERATIONS_ADMINISTRATION:
        categorie = JournalActivite.Categorie.ADMINISTRATION
    elif operation in JournalActivite.OPERATIONS_TECHNIQUES:
        categorie = JournalActivite.Categorie.TECHNIQUE
    else:
        categorie = JournalActivite.Categorie.SECURITE
    return JournalActivite.objects.create(
        categorie=categorie,
        operation=operation,
        auteur=auteur,
        auteur_username=auteur.username if auteur else '',
        cible=cible,
        cible_username=cible.username if cible else '',
        adresse_ip=adresse_ip(request),
        details=_details_sans_secret(details),
    )


def lien_definition_mot_de_passe(user):
    """Lien à usage unique : le jeton devient invalide dès que le mot de passe change."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    jeton = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_URL}/definir-mot-de-passe/{uid}/{jeton}"


def envoyer_lien_mot_de_passe(user, *, nouveau_compte):
    """
    Envoie à l'utilisateur, et à lui seul, le lien de définition de son mot de passe.
    L'administrateur ne voit jamais ni le lien ni le mot de passe.
    Retourne True si l'e-mail est parti.
    """
    if not user.email:
        return False
    validite_heures = settings.PASSWORD_RESET_TIMEOUT // 3600
    objet = (
        "Activation de votre compte - Université de Toliara" if nouveau_compte
        else "Réinitialisation de votre accès - Université de Toliara"
    )
    introduction = (
        "Un compte vient de vous être ouvert sur la plateforme de gestion des diplômes."
        if nouveau_compte else
        "L'administrateur de la plateforme a réinitialisé votre accès. Votre ancien mot de passe n'est plus valable."
    )
    message = (
        f"Bonjour {user.first_name or user.username},\n\n"
        f"{introduction}\n\n"
        f"Identifiant : {user.username}\n\n"
        f"Pour choisir votre mot de passe, ouvrez ce lien personnel (valable {validite_heures} heures, utilisable une seule fois) :\n\n"
        f"    {lien_definition_mot_de_passe(user)}\n\n"
        f"Si vous n'êtes pas concerné(e) par ce message, ignorez-le et prévenez l'administrateur.\n\n"
        f"Université de Toliara — Système de Gestion des Diplômes"
    )
    try:
        send_mail(objet, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return True
    except Exception as exc:
        # Pas de contenu du message dans les journaux : il contient le lien
        logger.warning("Échec d'envoi du lien de mot de passe à l'utilisateur #%s : %s", user.pk, type(exc).__name__)
        return False


def envoyer_email_equipe(adresse, titre, message):
    """Envoie un message à la boîte partagée d'une équipe. Retourne True si l'e-mail est parti."""
    objet = f"[Diplômes - {adresse.get_role_display()}] {titre}"
    corps = (
        f"{message}\n\n"
        f"Connectez-vous à la plateforme avec votre compte personnel pour traiter ce dossier :\n"
        f"{settings.FRONTEND_URL}/login\n\n"
        f"Message automatique adressé à l'équipe {adresse.get_role_display()} — "
        f"Université de Toliara, Système de Gestion des Diplômes"
    )
    try:
        send_mail(objet, corps, settings.DEFAULT_FROM_EMAIL, [adresse.email], fail_silently=False)
        return True
    except Exception as exc:
        logger.warning("Échec d'envoi de la notification à l'équipe %s : %s", adresse.role, type(exc).__name__)
        journaliser(JournalActivite.Operation.NOTIFICATION_EMAIL_ECHEC, details={
            'equipe': adresse.role, 'objet': titre, 'erreur': type(exc).__name__,
        })
        return False


def notifier_equipe_par_email(role, titre, message):
    """
    Copie par e-mail d'une notification adressée à toute une équipe, si l'administrateur
    a configuré une adresse active pour cette équipe. L'envoi a lieu après validation
    de la transaction : une étape annulée n'envoie rien, et un échec d'envoi ne
    bloque jamais le circuit des diplômes.
    """
    def envoyer():
        try:
            adresse = AdresseNotificationEquipe.objects.filter(role=role, actif=True).first()
            if adresse is not None:
                envoyer_email_equipe(adresse, titre, message)
        except Exception:
            # Exécuté après validation : une erreur ici ne doit pas remonter à l'utilisateur
            logger.exception("Erreur inattendue lors de la notification par e-mail de l'équipe %s", role)

    transaction.on_commit(envoyer)
