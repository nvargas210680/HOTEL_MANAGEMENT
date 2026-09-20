from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# Third-party / DRF imports
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# Local application views
from bookings.views import (
    BookingViewSet,
    CustomTokenObtainPairView,
    GuestsViewSet,
    HotelViewSet,
    ProfileView,
    RegisterView,
    RoomsViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    admin_booking_detail,
    admin_booking_list,
    create_invoice,
    get_invoice,
    update_invoice,
    booking_revenue_report,
    addon_sales_report,
)


# Router configuration
router = DefaultRouter()
router.register(r'hotels', HotelViewSet)
router.register(r'rooms', RoomsViewSet)
router.register(r'guests', GuestsViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')

# URL Patterns
urlpatterns = [
    # Admin Interface
    path('admin/', admin.site.urls),

    # Authentication & User Management
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    path('api/profile/', ProfileView.as_view(), name='user-profile'),
    path(
        'api/password-reset/',
        PasswordResetRequestView.as_view(),
        name='password_reset_request'
    ),
    path(
        'api/password-reset-confirm/<uidb64>/<token>/',
        PasswordResetConfirmView.as_view(),
        name='password_reset_confirm'
    ),

    # Custom Admin Booking Endpoints
    path(
        'api/admin/bookings/',
        admin_booking_list,
        name='admin-booking-list'
    ),
    path(
        'api/admin/bookings/<int:pk>/',
        admin_booking_detail,
        name='admin-booking-detail'
    ),

    # Invoice
    path(
        'api/invoices/',
        create_invoice,
        name='create-invoice'
    ),
    path(
        'api/invoices/<int:booking_id>/',
        get_invoice,
        name='get-invoice'
    ),

    # Admin Reports
    path(
        'api/admin/reports/bookings/',
        booking_revenue_report,
        name='booking-revenue-report'
    ),
    path(
        'api/admin/reports/add-ons/',
        addon_sales_report,
        name='addon-sales-report'
    ),

    # ViewSets & DRF Session Auth
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
    
    path(
    'api/invoices/<int:booking_id>/',
    get_invoice,
    name='get-invoice'
    ),
    path(
    'api/invoices/<int:booking_id>/update/',
    update_invoice,
    name='update-invoice'
    ),
]

# Serve media files in development mode
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )