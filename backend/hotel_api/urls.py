
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from bookings.views import (
    CustomTokenObtainPairView,
    admin_booking_list,
    admin_booking_detail,
    HotelViewSet, 
    RoomsViewSet, 
    GuestsViewSet, 
    RegisterView,
    BookingViewSet
)


router = DefaultRouter()
router.register(r'hotels', HotelViewSet)
router.register(r'rooms', RoomsViewSet)
router.register(r'guests', GuestsViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    
    # Admin Booking Routes
    path('api/admin/bookings/', admin_booking_list, name='admin-booking-list'),
    path('api/admin/bookings/<int:pk>/', admin_booking_detail, name='admin-booking-detail'),

    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
