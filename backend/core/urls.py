"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT : les jetons ne sont délivrés qu'après la 2FA (api/auth/verify-otp/).
    # Pas de api/token/ : il délivrait un jeton sur le seul mot de passe.
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Apps APIs endpoints
    path('api/', include('utilisateurs.urls')),
    path('api/', include('demandes.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('diplomes.urls')),
    path('api/chatbot/', include('chatbot.urls')),
    path('api/administration/', include('administration.urls')),
]

if settings.DEBUG:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Documentation interactive de l'API : non exposée en production
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ]
