from django.urls import path
from .views import ChatbotAskView, ChatbotSuggestionsView

urlpatterns = [
    path('ask/', ChatbotAskView.as_view(), name='chatbot-ask'),
    path('suggestions/', ChatbotSuggestionsView.as_view(), name='chatbot-suggestions'),
]
