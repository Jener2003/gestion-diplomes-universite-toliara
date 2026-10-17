from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from .services import ChatbotSecurityService


class ChatbotAskView(APIView):
    """
    Endpoint de chat sécurisé avec authentification obligatoire.
    Chaque réponse est calculée en fonction stricte du rôle et des permissions de l'utilisateur connecté.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Chatbot'],
        summary="Pose une question à l'assistant (réponse limitée au rôle de l'agent)",
        request=inline_serializer('QuestionChatbot', {'message': serializers.CharField()}),
        responses=OpenApiTypes.OBJECT,
    )
    def post(self, request):
        user = request.user
        message = request.data.get('message', '').strip()

        try:
            result = ChatbotSecurityService.process_message(user, message)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "reply": "Désolé, une erreur interne est survenue lors du traitement de votre question. Veuillez réessayer.",
                    "suggestions": ChatbotSecurityService.get_suggestions_for_role(user.role),
                    "error": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChatbotSuggestionsView(APIView):
    """Retourne les suggestions de questions rapides adaptées au rôle."""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Chatbot'], summary="Suggestions de questions selon le rôle", responses=OpenApiTypes.OBJECT)
    def get(self, request):
        suggestions = ChatbotSecurityService.get_suggestions_for_role(request.user.role)
        return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)
