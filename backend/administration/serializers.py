from rest_framework import serializers

from utilisateurs.models import Utilisateur

from .models import AdresseNotificationEquipe, JournalActivite


class JournalActiviteSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    operation_display = serializers.CharField(source='get_operation_display', read_only=True)

    class Meta:
        model = JournalActivite
        fields = (
            'id', 'date', 'categorie', 'categorie_display', 'operation', 'operation_display',
            'auteur', 'auteur_username', 'cible', 'cible_username', 'adresse_ip', 'details',
        )
        read_only_fields = fields


class AdminUtilisateurSerializer(serializers.ModelSerializer):
    """
    Champs qu'un administrateur peut voir et modifier sur un compte.
    Jamais exposés ni modifiables : mot de passe, is_staff, is_superuser, groupes,
    permissions. L'identifiant est fixé à la création (traçabilité de l'historique) ;
    l'état actif/inactif passe par les actions dédiées activer / desactiver.
    """
    role_display = serializers.SerializerMethodField()
    role_obsolete = serializers.SerializerMethodField()
    mot_de_passe_defini = serializers.SerializerMethodField()
    est_superutilisateur = serializers.BooleanField(source='is_superuser', read_only=True)
    email = serializers.EmailField(max_length=254)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    class Meta:
        model = Utilisateur
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role', 'role_display',
            'role_obsolete', 'is_active', 'mot_de_passe_defini', 'est_superutilisateur',
            'date_joined', 'last_login',
        )
        read_only_fields = ('id', 'is_active', 'date_joined', 'last_login')

    def get_role_display(self, user) -> str:
        libelles = dict(Utilisateur.Role.choices)
        return libelles.get(user.role, f"Rôle obsolète ({user.role})")

    def get_role_obsolete(self, user) -> bool:
        return user.role not in Utilisateur.Role.values

    def get_mot_de_passe_defini(self, user) -> bool:
        return user.has_usable_password()

    def validate_username(self, value):
        value = value.strip()
        if self.instance is not None:
            if value != self.instance.username:
                raise serializers.ValidationError("L'identifiant ne peut pas être modifié après la création du compte.")
            return value
        if Utilisateur.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Cet identifiant est déjà utilisé.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        autres = Utilisateur.objects.filter(email__iexact=value)
        if self.instance is not None:
            autres = autres.exclude(pk=self.instance.pk)
        if autres.exists():
            raise serializers.ValidationError("Cette adresse e-mail est déjà associée à un autre compte.")
        # Un compte reste personnel : il ne reçoit pas ses codes de connexion dans une boîte d'équipe
        if AdresseNotificationEquipe.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Cette adresse est l'adresse de notification d'une équipe : indiquez l'adresse personnelle de l'agent."
            )
        return value

    def validate_first_name(self, value):
        return value.strip()

    def validate_last_name(self, value):
        return value.strip()

    def validate_role(self, value):
        # Un rôle existant non attribuable (ex. Scolarité d'établissement) peut être
        # conservé tel quel, mais jamais attribué.
        if self.instance is not None and value == self.instance.role:
            return value
        if value not in Utilisateur.ROLES_ATTRIBUABLES:
            raise serializers.ValidationError("Ce rôle ne peut pas être attribué depuis l'espace Administrateur.")
        return value

    def validate(self, attrs):
        demandeur = self.context['request'].user
        if self.instance is not None and self.instance.pk == demandeur.pk \
                and attrs.get('role', self.instance.role) != self.instance.role:
            raise serializers.ValidationError({'role': "Vous ne pouvez pas modifier votre propre rôle."})
        if self.instance is None and 'role' not in attrs:
            raise serializers.ValidationError({'role': "Le rôle est obligatoire."})
        return attrs


class AdresseEquipeSerializer(serializers.Serializer):
    """Saisie de l'adresse fonctionnelle d'une équipe (distincte des comptes personnels)."""
    email = serializers.EmailField(max_length=254)
    actif = serializers.BooleanField(default=True)

    def validate_email(self, value):
        value = value.strip().lower()
        # Une boîte partagée ne doit pas servir d'adresse de compte : le code de
        # connexion (OTP) d'un agent arriverait alors dans une boîte commune.
        if Utilisateur.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Cette adresse est déjà celle d'un compte personnel : utilisez une adresse fonctionnelle d'équipe."
            )
        return value
