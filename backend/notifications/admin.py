from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'utilisateur', 'titre', 'type_notification', 'lu', 'date_creation')
    list_filter = ('lu', 'type_notification')
    search_fields = ('utilisateur__username', 'titre', 'message')
