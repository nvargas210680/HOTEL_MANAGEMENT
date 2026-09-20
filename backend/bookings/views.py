from decimal import Decimal
from datetime import datetime

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Bookings,
    Guests,
    Hotel,
    Rooms,
    RoomTypes,
    Invoice,
    InvoiceItem,
)

from .serializers import (
    AdminBookingSerializer,
    BookingSerializer,
    GuestsSerializer,
    HotelSerializer,
    RegisterSerializer,
    RoomsSerializer,
    RoomTypesSerializer,
    UserProfileSerializer,
)


def get_active_overlapping_bookings(room_type, check_in, check_out, exclude_id=None):
    queryset = Bookings.objects.filter(
        room_type=room_type,
        check_in_date__lt=check_out,
        check_out_date__gt=check_in,
    ).exclude(
        status='Cancelled'
    )

    if exclude_id:
        queryset = queryset.exclude(
            pk=exclude_id
        )

    return queryset


def get_room_type_availability(room_type, check_in=None, check_out=None, exclude_id=None):
    if not check_in or not check_out:
        return room_type.inventory

    overlapping_bookings = get_active_overlapping_bookings(
        room_type,
        check_in,
        check_out,
        exclude_id=exclude_id,
    )

    return max(
        room_type.inventory - overlapping_bookings.count(),
        0
    )


def room_type_has_availability(room_type, check_in, check_out, exclude_id=None):
    if check_out <= check_in:
        return False

    current_date = check_in

    while current_date < check_out:
        next_date = current_date.fromordinal(
            current_date.toordinal() + 1
        )

        bookings_for_night = Bookings.objects.filter(
            room_type=room_type,
            check_in_date__lt=next_date,
            check_out_date__gt=current_date,
        ).exclude(
            status='Cancelled'
        )

        if exclude_id:
            bookings_for_night = bookings_for_night.exclude(
                pk=exclude_id
            )

        if bookings_for_night.count() >= room_type.inventory:
            return False

        current_date = next_date

    return True


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_booking_list(request):
    bookings = Bookings.objects.select_related(
        'guest',
        'room',
        'room_type',
    ).all()

    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    if from_date:
        try:
            from_date = datetime.strptime(
                from_date,
                '%Y-%m-%d'
            ).date()

            bookings = bookings.filter(
                check_in_date__gte=from_date
            )

        except ValueError:
            return Response(
                {
                    'error':
                        'Invalid from_date format. '
                        'Use YYYY-MM-DD.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    if to_date:
        try:
            to_date = datetime.strptime(
                to_date,
                '%Y-%m-%d'
            ).date()

            bookings = bookings.filter(
                check_in_date__lte=to_date
            )

        except ValueError:
            return Response(
                {
                    'error':
                        'Invalid to_date format. '
                        'Use YYYY-MM-DD.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    bookings = bookings.order_by('-booking_id')

    serializer = AdminBookingSerializer(
        bookings,
        many=True
    )

    return Response(serializer.data)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_booking_detail(request, pk):
    try:
        booking = Bookings.objects.select_related(
            'guest',
            'room',
            'room_type',
        ).get(pk=pk)

    except Bookings.DoesNotExist:
        return Response(
            {
                'detail': 'Booking not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = AdminBookingSerializer(booking)
        return Response(serializer.data)

    if request.method in ['PATCH', 'PUT']:
        serializer = AdminBookingSerializer(
            booking,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'DELETE':
        booking.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    booking_id = request.data.get('booking_id')
    invoice_date = request.data.get('invoice_date')
    room_nights = request.data.get('room_nights')
    room_rate = request.data.get('room_rate')
    subtotal = request.data.get('subtotal')
    gst_amount = request.data.get('gst_amount')
    total_amount = request.data.get('total_amount')
    extra_charges = request.data.get(
        'extra_charges',
        []
    )

    if not booking_id:
        return Response(
            {
                'error': 'Booking ID is required.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        booking = Bookings.objects.get(
            pk=booking_id
        )

    except Bookings.DoesNotExist:
        return Response(
            {
                'error': 'Booking not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if hasattr(booking, 'invoice'):
        return Response(
            {
                'error':
                    'An invoice already exists for this booking.',
                'invoice_id':
                    booking.invoice.invoice_id
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not invoice_date:
        return Response(
            {
                'error': 'Invoice date is required.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        invoice = Invoice.objects.create(
            booking=booking,
            invoice_date=invoice_date,
            room_nights=room_nights,
            room_rate=room_rate,
            subtotal=subtotal,
            gst_amount=gst_amount,
            total_amount=total_amount,
            status='Completed'
        )

        for charge in extra_charges:
            description = charge.get(
                'description',
                ''
            ).strip()

            amount = charge.get(
                'amount',
                0
            )

            if description and float(amount) > 0:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=description,
                    amount=amount
                )

        return Response(
            {
                'message':
                    'Invoice created successfully.',
                'invoice_id':
                    invoice.invoice_id,
                'booking_id':
                    booking.booking_id,
                'total_amount':
                    invoice.total_amount
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as error:
        return Response(
            {
                'error': str(error)
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def booking_revenue_report(request):
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    invoices = (
        Invoice.objects
        .filter(status='Completed')
        .select_related(
            'booking',
            'booking__guest',
            'booking__room',
            'booking__room_type',
        )
    )

    if from_date:
        try:
            from_date = datetime.strptime(
                from_date,
                '%Y-%m-%d'
            ).date()

            invoices = invoices.filter(
                invoice_date__gte=from_date
            )

        except ValueError:
            return Response(
                {
                    'error':
                        'Invalid from_date format. '
                        'Use YYYY-MM-DD.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    if to_date:
        try:
            to_date = datetime.strptime(
                to_date,
                '%Y-%m-%d'
            ).date()

            invoices = invoices.filter(
                invoice_date__lte=to_date
            )

        except ValueError:
            return Response(
                {
                    'error':
                        'Invalid to_date format. '
                        'Use YYYY-MM-DD.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    invoices = invoices.order_by(
        '-invoice_date',
        '-invoice_id'
    )

    report = []

    total_raw_booking_cost = Decimal('0.00')
    total_revenue = Decimal('0.00')

    for invoice in invoices:
        raw_booking_cost = (
            invoice.room_nights *
            invoice.room_rate
        )

        revenue_30_percent = (
            raw_booking_cost *
            Decimal('0.30')
        )

        if invoice.booking.room_type:
            room_name = invoice.booking.room_type.name
        elif invoice.booking.room:
            room_name = (
                f"Room "
                f"{invoice.booking.room.room_number}"
            )
        else:
            room_name = "Unknown Room"

        report.append(
            {
                'invoice_id':
                    invoice.invoice_id,

                'booking_id':
                    invoice.booking.booking_id,

                'guest_name':
                    (
                        f"{invoice.booking.guest.first_name} "
                        f"{invoice.booking.guest.last_name}"
                    ),

                'room_number':
                    room_name,

                'check_in_date':
                    invoice.booking.actual_check_in_date,

                'check_out_date':
                    invoice.booking.actual_check_out_date,

                'room_nights':
                    invoice.room_nights,

                'room_rate':
                    float(invoice.room_rate),

                'raw_booking_cost':
                    float(raw_booking_cost),

                'revenue_30_percent':
                    float(revenue_30_percent),

                'invoice_date':
                    invoice.invoice_date,
            }
        )

        total_raw_booking_cost += raw_booking_cost
        total_revenue += revenue_30_percent

    return Response(
        {
            'summary': {
                'total_bookings':
                    len(report),

                'total_raw_booking_cost':
                    float(total_raw_booking_cost),

                'total_revenue_30_percent':
                    float(total_revenue),
            },

            'bookings':
                report,
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_invoice(request, booking_id):
    try:
        invoice = (
            Invoice.objects
            .select_related(
                'booking',
                'booking__guest',
                'booking__room',
                'booking__room_type',
            )
            .prefetch_related('items')
            .get(
                booking_id=booking_id
            )
        )

    except Invoice.DoesNotExist:
        return Response(
            {
                'error':
                    'Invoice not found for this booking.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if invoice.booking.room_type:
        room_name = invoice.booking.room_type.name
    elif invoice.booking.room:
        room_name = (
            f"Room "
            f"{invoice.booking.room.room_number}"
        )
    else:
        room_name = "Unknown Room"

    return Response(
        {
            'invoice_id':
                invoice.invoice_id,

            'booking_id':
                invoice.booking.booking_id,

            'invoice_date':
                invoice.invoice_date,

            'guest_name':
                (
                    f"{invoice.booking.guest.first_name} "
                    f"{invoice.booking.guest.last_name}"
                ),

            'guest_email':
                invoice.booking.guest.email,

            'guest_phone':
                invoice.booking.guest.phone_number,

            'room_number':
                room_name,

            'actual_check_in_date':
                invoice.booking.actual_check_in_date,

            'actual_check_out_date':
                invoice.booking.actual_check_out_date,

            'room_nights':
                invoice.room_nights,

            'room_rate':
                float(invoice.room_rate),

            'subtotal':
                float(invoice.subtotal),

            'gst_amount':
                float(invoice.gst_amount),

            'total_amount':
                float(invoice.total_amount),

            'status':
                invoice.status,

            'items': [
                {
                    'invoice_item_id':
                        item.invoice_item_id,

                    'description':
                        item.description,

                    'amount':
                        float(item.amount),
                }
                for item in invoice.items.all()
            ],
        }
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def addon_sales_report(request):
    items = (
        InvoiceItem.objects
        .filter(invoice__status='Completed')
        .select_related(
            'invoice',
            'invoice__booking',
            'invoice__booking__guest',
        )
    )

    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    if from_date:
        try:
            from_date = datetime.strptime(
                from_date,
                '%Y-%m-%d'
            ).date()

            items = items.filter(
                invoice__invoice_date__gte=from_date
            )

        except ValueError:
            return Response(
                {
                    'error':
                        'Invalid from_date format. '
                        'Use YYYY-MM-DD.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    if to_date:
        try:
            to_date = datetime.strptime(
                to_date,
                '%Y-%m-%d'
            ).date()

            items = items.filter(
                invoice__invoice_date__lte=to_date
            )

        except ValueError:
            return Response(
                {
                    'error':
                        'Invalid to_date format. '
                        'Use YYYY-MM-DD.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    items = items.order_by(
        '-invoice__invoice_date',
        '-invoice_item_id'
    )

    report = []

    total_addon_sales = Decimal('0.00')

    for item in items:
        amount = item.amount

        report.append(
            {
                'invoice_id':
                    item.invoice.invoice_id,

                'booking_id':
                    item.invoice.booking.booking_id,

                'invoice_date':
                    item.invoice.invoice_date,

                'guest_name':
                    (
                        f"{item.invoice.booking.guest.first_name} "
                        f"{item.invoice.booking.guest.last_name}"
                    ),

                'description':
                    item.description,

                'amount':
                    float(amount),
            }
        )

        total_addon_sales += amount

    return Response(
        {
            'summary': {
                'total_addon_items':
                    len(report),

                'total_addon_sales':
                    float(total_addon_sales),
            },

            'add_ons':
                report,
        }
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_invoice(request, booking_id):
    try:
        invoice = Invoice.objects.get(
            booking_id=booking_id
        )

    except Invoice.DoesNotExist:
        return Response(
            {
                'error':
                    'Invoice not found for this booking.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    extra_charges = request.data.get(
        'extra_charges',
        []
    )

    try:
        invoice.items.all().delete()

        for charge in extra_charges:
            description = str(
                charge.get(
                    'description',
                    ''
                )
            ).strip()

            try:
                amount = Decimal(
                    str(
                        charge.get(
                            'amount',
                            0
                        )
                    )
                )

            except (ValueError, TypeError):
                continue

            if description and amount > 0:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=description,
                    amount=amount
                )

        extra_charges_total = sum(
            (
                item.amount
                for item in invoice.items.all()
            ),
            Decimal('0.00')
        )

        room_amount = (
            Decimal(invoice.room_nights) *
            invoice.room_rate
        )

        subtotal = (
            room_amount +
            extra_charges_total
        )

        gst_amount = (
            subtotal *
            Decimal('0.05')
        )

        total_amount = (
            subtotal +
            gst_amount
        )

        invoice.subtotal = subtotal
        invoice.gst_amount = gst_amount
        invoice.total_amount = total_amount

        invoice.save(
            update_fields=[
                'subtotal',
                'gst_amount',
                'total_amount',
            ]
        )

        return Response(
            {
                'message':
                    'Invoice updated successfully.',

                'invoice_id':
                    invoice.invoice_id,

                'booking_id':
                    invoice.booking.booking_id,

                'subtotal':
                    float(invoice.subtotal),

                'gst_amount':
                    float(invoice.gst_amount),

                'total_amount':
                    float(invoice.total_amount),

                'items': [
                    {
                        'invoice_item_id':
                            item.invoice_item_id,

                        'description':
                            item.description,

                        'amount':
                            float(item.amount),
                    }
                    for item in invoice.items.all()
                ],
            }
        )

    except Exception as error:
        return Response(
            {
                'error': str(error)
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class CustomTokenObtainPairSerializer(
    TokenObtainPairSerializer
):
    def validate(self, attrs):
        data = super().validate(attrs)

        data['is_staff'] = self.user.is_staff
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name

        return data


class CustomTokenObtainPairView(
    TokenObtainPairView
):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class HotelViewSet(viewsets.ModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [
        IsAuthenticatedOrReadOnly
    ]


class RoomsViewSet(viewsets.ModelViewSet):
    queryset = Rooms.objects.all()
    serializer_class = RoomsSerializer
    permission_classes = [
        IsAuthenticatedOrReadOnly
    ]

    def perform_create(self, serializer):
        serializer.save(
            hotel_id=1
        )


class RoomTypesViewSet(viewsets.ModelViewSet):
    serializer_class = RoomTypesSerializer
    permission_classes = [
        IsAuthenticatedOrReadOnly
    ]

    def get_queryset(self):
        room_types = RoomTypes.objects.all()

        check_in = self.request.query_params.get(
            'check_in'
        )

        check_out = self.request.query_params.get(
            'check_out'
        )

        if check_in and check_out:
            try:
                check_in_date = datetime.strptime(
                    check_in,
                    '%Y-%m-%d'
                ).date()

                check_out_date = datetime.strptime(
                    check_out,
                    '%Y-%m-%d'
                ).date()

                for room_type in room_types:
                    room_type.available_inventory = (
                        get_room_type_availability(
                            room_type,
                            check_in_date,
                            check_out_date
                        )
                    )

            except ValueError:
                for room_type in room_types:
                    room_type.available_inventory = (
                        room_type.inventory
                    )

        else:
            for room_type in room_types:
                room_type.available_inventory = (
                    room_type.inventory
                )

        return room_types

    def perform_create(self, serializer):
        serializer.save(
            hotel_id=1
        )


class GuestsViewSet(viewsets.ModelViewSet):
    queryset = Guests.objects.all()
    serializer_class = GuestsSerializer
    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Guests.objects.all()

        return Guests.objects.filter(
            user=self.request.user
        )


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return Bookings.objects.select_related(
                'guest',
                'room',
                'room_type',
            ).all()

        return Bookings.objects.select_related(
            'guest',
            'room',
            'room_type',
        ).filter(
            guest__user=user
        )

    @transaction.atomic
    def perform_create(self, serializer):
        check_in = serializer.validated_data[
            'check_in_date'
        ]

        check_out = serializer.validated_data[
            'check_out_date'
        ]

        room_type = serializer.validated_data.get(
            'room_type'
        )

        room = serializer.validated_data.get(
            'room'
        )

        target_guest_id = (
            self.request.data.get('guest') or
            self.request.data.get('guest_id')
        )

        if self.request.user.is_staff:
            if target_guest_id:
                try:
                    guest_instance = Guests.objects.get(
                        pk=target_guest_id
                    )

                except Guests.DoesNotExist:
                    raise ValidationError(
                        {
                            "guest":
                                "The specified guest does not exist."
                        }
                    )

            else:
                guest_email = self.request.data.get(
                    'email'
                )

                if not guest_email:
                    raise ValidationError(
                        {
                            "email":
                                "Email is required to record "
                                "a walk-in booking."
                        }
                    )

                guest_instance, _ = Guests.objects.get_or_create(
                    email=guest_email,
                    defaults={
                        'user': None,
                        'first_name':
                            self.request.data.get(
                                'first_name',
                                'Walk-in'
                            ),
                        'last_name':
                            self.request.data.get(
                                'last_name',
                                'Guest'
                            ),
                        'phone_number':
                            self.request.data.get(
                                'phone_number',
                                ''
                            ),
                        'id_document':
                            self.request.data.get(
                                'id_document',
                                ''
                            ),
                    }
                )

        else:
            try:
                guest_instance = Guests.objects.get(
                    user=self.request.user
                )

            except Guests.DoesNotExist:
                raise ValidationError(
                    {
                        "detail":
                            "No guest profile found for "
                            "this user account."
                    }
                )

        if room_type:
            room_type = RoomTypes.objects.select_for_update().get(
                pk=room_type.pk
            )

            if not room_type_has_availability(
                room_type,
                check_in,
                check_out
            ):
                raise ValidationError(
                    {
                        "error":
                            "This room type is fully booked "
                            "for the selected dates."
                    }
                )

            nights = (
                check_out -
                check_in
            ).days

            total_price = (
                nights *
                room_type.price_per_night
            )

            serializer.save(
                guest=guest_instance,
                room_type=room_type,
                room=None,
                total_price=total_price,
                status='Confirmed'
            )

            return

        if room:
            nights = (
                check_out -
                check_in
            ).days

            total_price = (
                nights *
                room.price_per_night
            )

            serializer.save(
                guest=guest_instance,
                total_price=total_price,
                status='Confirmed'
            )

            return

        raise ValidationError(
            {
                "room_type":
                    "A room type is required."
            }
        )

    @transaction.atomic
    def perform_update(self, serializer):
        instance = self.get_object()

        check_in = serializer.validated_data.get(
            'check_in_date',
            instance.check_in_date
        )

        check_out = serializer.validated_data.get(
            'check_out_date',
            instance.check_out_date
        )

        if check_out <= check_in:
            raise ValidationError(
                {
                    "check_out_date":
                        "Check-out date must be after "
                        "check-in date."
                }
            )

        room_type = instance.room_type

        if room_type:
            room_type = RoomTypes.objects.select_for_update().get(
                pk=room_type.pk
            )

            if not room_type_has_availability(
                room_type,
                check_in,
                check_out,
                exclude_id=instance.booking_id
            ):
                raise ValidationError(
                    {
                        "error":
                            "This room type is fully booked "
                            "for the selected dates."
                    }
                )

            nights = (
                check_out -
                check_in
            ).days

            total_price = (
                nights *
                room_type.price_per_night
            )

            serializer.save(
                total_price=total_price
            )

            return

        room = instance.room

        if room:
            overlapping_bookings = Bookings.objects.filter(
                room=room,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            ).exclude(
                status='Cancelled'
            ).exclude(
                pk=instance.pk
            )

            if overlapping_bookings.exists():
                raise ValidationError(
                    {
                        "error":
                            "This room is already booked "
                            "for the selected dates."
                    }
                )

            nights = (
                check_out -
                check_in
            ).days

            total_price = (
                nights *
                room.price_per_night
            )

            serializer.save(
                total_price=total_price
            )

            return

        serializer.save()


class ProfileView(APIView):
    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):
        serializer = UserProfileSerializer(
            request.user,
            context={
                'request': request
            }
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={
                'request': request
            }
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetRequestView(APIView):
    permission_classes = [
        AllowAny
    ]

    def post(self, request):
        email = request.data.get(
            'email'
        )

        if not email:
            return Response(
                {
                    'error':
                        'Email is required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                email=email
            )

            token = default_token_generator.make_token(
                user
            )

            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            reset_link = (
                f"http://localhost:3000/"
                f"auth/reset-password"
                f"?uid={uid}&token={token}"
            )

            print("\n" + "=" * 50)
            print(
                f"PASSWORD RESET LINK FOR {email}:"
            )
            print(reset_link)
            print("=" * 50 + "\n")

            send_mail(
                subject="Password Reset Request",
                message=(
                    "Click the link below to reset "
                    f"your password:\n{reset_link}"
                ),
                from_email="noreply@hotelmanagement.com",
                recipient_list=[email],
                fail_silently=True,
            )

        except User.DoesNotExist:
            pass

        return Response(
            {
                'message':
                    'If an account with this email exists, '
                    'a password reset link has been sent.'
            },
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [
        AllowAny
    ]

    def post(self, request, uidb64, token):
        password = request.data.get(
            'password'
        )

        confirm_password = request.data.get(
            'confirm_password'
        )

        if not password or not confirm_password:
            return Response(
                {
                    'error':
                        'Both password fields are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != confirm_password:
            return Response(
                {
                    'error':
                        'Passwords do not match.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uid = force_str(
                urlsafe_base64_decode(uidb64)
            )

            user = User.objects.get(
                pk=uid
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist
        ):
            user = None

        if (
            user is not None and
            default_token_generator.check_token(
                user,
                token
            )
        ):
            user.set_password(password)
            user.save()

            return Response(
                {
                    'message':
                        'Password has been reset successfully.'
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                'error':
                    'The reset link is invalid or has expired.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )