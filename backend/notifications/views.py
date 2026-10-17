from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Pour qu'un utilisateur ne voie que ses propres notifications, les plus récentes en premier
        return self.queryset.filter(utilisateur=self.request.user).order_by('-date_creation')

    @action(detail=True, methods=['post'])
    def marquer_lu(self, request, pk=None):
        notification = self.get_object()
        notification.lu = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def marquer_tous_lus(self, request):
        self.get_queryset().filter(lu=False).update(lu=True)
        return Response({'status': 'ok'})
