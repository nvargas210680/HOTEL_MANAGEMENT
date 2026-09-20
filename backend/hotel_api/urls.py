from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from bookings.views import (
    BookingViewSet,
    CustomTokenObtainPairView,
    GuestsViewSet,
    HotelViewSet,
    RegisterView,
    RoomsViewSet,
    RoomTypesViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ProfileView,
    admin_booking_detail,
    admin_booking_list,
    create_invoice,
    get_invoice,
    update_invoice,
    booking_revenue_report,
    addon_sales_report,
)

router = DefaultRouter()
router.register(r'hotels', HotelViewSet)
router.register(r'rooms', RoomsViewSet)
router.register(r'room-types', RoomTypesViewSet, basename='room-type')
router.register(r'guests', GuestsViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('admin/', admin.site.urls),

    path(
        'api/token/',
        CustomTokenObtainPairView.as_view(),
        name='token_obtain_pair'
    ),

    path(
        'api/token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh'
    ),

    path(
        'api/register/',
        RegisterView.as_view(),
        name='auth_register'
    ),

    path(
        'api/profile/',
        ProfileView.as_view(),
        name='user-profile'
    ),

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

    path(
        'api/invoices/<int:booking_id>/update/',
        update_invoice,
        name='update-invoice'
    ),

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

    path(
        'api/',
        include(router.urls)
    ),

    path(
        'api-auth/',
        include('rest_framework.urls')
    ),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )