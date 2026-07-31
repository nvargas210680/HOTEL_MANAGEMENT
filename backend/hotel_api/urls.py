"""
URL configuration for hotel_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
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
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Import all 4 of your views from the bookings app
from bookings.views import (
    HotelViewSet, 
    RoomsViewSet, 
    GuestsViewSet, 
    RegisterView
)

# 1. Register the ViewSets with the Router
router = DefaultRouter()
router.register(r'hotels', HotelViewSet)
router.register(r'rooms', RoomsViewSet)
router.register(r'guests', GuestsViewSet)

# 2. Combine all URL routes
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Token Authentication Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Registration Endpoint
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    
    # ViewSet Routes (/api/hotels/, /api/rooms/, /api/guests/)
    path('api/', include(router.urls)),
]
