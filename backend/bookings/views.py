
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import IntegrityError
from django.shortcuts import render
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

# REST Framework imports
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
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

# Third-party library imports
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# Local app imports
from .models import (
    Bookings,
    Guests,
    Hotel,
    Rooms,
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
    UserProfileSerializer,
)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_booking_list(request):
    bookings = Bookings.objects.all().order_by('-booking_id')
    serializer = AdminBookingSerializer(bookings, many=True)
    return Response(serializer.data)

@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_booking_detail(request, pk):
    try:
        booking = Bookings.objects.get(pk=pk)
    except Bookings.DoesNotExist:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AdminBookingSerializer(booking)
        return Response(serializer.data)

    elif request.method in ['PATCH', 'PUT']:
        serializer = AdminBookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
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
    extra_charges = request.data.get('extra_charges', [])

    if not booking_id:
        return Response(
            {'error': 'Booking ID is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        booking = Bookings.objects.get(pk=booking_id)
    except Bookings.DoesNotExist:
        return Response(
            {'error': 'Booking not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if hasattr(booking, 'invoice'):
        return Response(
            {
                'error': 'An invoice already exists for this booking.',
                'invoice_id': booking.invoice.invoice_id
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not invoice_date:
        return Response(
            {'error': 'Invoice date is required.'},
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
            description = charge.get('description', '').strip()
            amount = charge.get('amount', 0)

            if description and float(amount) > 0:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=description,
                    amount=amount
                )

        return Response(
            {
                'message': 'Invoice created successfully.',
                'invoice_id': invoice.invoice_id,
                'booking_id': booking.booking_id,
                'total_amount': invoice.total_amount
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as error:
        return Response(
            {'error': str(error)},
            status=status.HTTP_400_BAD_REQUEST
        )
        
@api_view(['GET'])
@permission_classes([IsAdminUser])
def booking_revenue_report(request):
    from decimal import Decimal
    from datetime import datetime

    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    invoices = (
        Invoice.objects
        .filter(status='Completed')
        .select_related(
            'booking',
            'booking__guest',
            'booking__room'
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
                    'error': (
                        'Invalid from_date format. '
                        'Use YYYY-MM-DD.'
                    )
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
                    'error': (
                        'Invalid to_date format. '
                        'Use YYYY-MM-DD.'
                    )
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
            invoice.room_nights * invoice.room_rate
        )

        revenue_30_percent = (
            raw_booking_cost * Decimal('0.30')
        )

        report.append({
            'invoice_id': invoice.invoice_id,
            'booking_id': invoice.booking.booking_id,
            'guest_name': (
                f"{invoice.booking.guest.first_name} "
                f"{invoice.booking.guest.last_name}"
            ),
            'room_number': invoice.booking.room.room_number,
            'check_in_date': invoice.booking.actual_check_in_date,
            'check_out_date': invoice.booking.actual_check_out_date,
            'room_nights': invoice.room_nights,
            'room_rate': float(invoice.room_rate),
            'raw_booking_cost': float(raw_booking_cost),
            'revenue_30_percent': float(revenue_30_percent),
            'invoice_date': invoice.invoice_date,
        })

        total_raw_booking_cost += raw_booking_cost
        total_revenue += revenue_30_percent

    return Response({
        'summary': {
            'total_bookings': len(report),
            'total_raw_booking_cost': float(
                total_raw_booking_cost
            ),
            'total_revenue_30_percent': float(
                total_revenue
            ),
        },
        'bookings': report,
    })
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_invoice(request, booking_id):
    try:
        invoice = (
            Invoice.objects
            .select_related(
                'booking',
                'booking__guest',
                'booking__room'
            )
            .prefetch_related('items')
            .get(booking_id=booking_id)
        )
    except Invoice.DoesNotExist:
        return Response(
            {'error': 'Invoice not found for this booking.'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        'invoice_id': invoice.invoice_id,
        'booking_id': invoice.booking.booking_id,
        'invoice_date': invoice.invoice_date,
        'guest_name': (
            f"{invoice.booking.guest.first_name} "
            f"{invoice.booking.guest.last_name}"
        ),
        'guest_email': invoice.booking.guest.email,
        'guest_phone': invoice.booking.guest.phone_number,
        'room_number': invoice.booking.room.room_number,
        'actual_check_in_date': invoice.booking.actual_check_in_date,
        'actual_check_out_date': invoice.booking.actual_check_out_date,
        'room_nights': invoice.room_nights,
        'room_rate': float(invoice.room_rate),
        'subtotal': float(invoice.subtotal),
        'gst_amount': float(invoice.gst_amount),
        'total_amount': float(invoice.total_amount),
        'status': invoice.status,
        'items': [
            {
                'invoice_item_id': item.invoice_item_id,
                'description': item.description,
                'amount': float(item.amount),
            }
            for item in invoice.items.all()
        ],
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def addon_sales_report(request):
    from decimal import Decimal
    from datetime import datetime

    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    items = (
        InvoiceItem.objects
        .filter(invoice__status='Completed')
        .select_related(
            'invoice',
            'invoice__booking',
            'invoice__booking__guest'
        )
    )

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
                {'error': 'Invalid from_date format. Use YYYY-MM-DD.'},
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
                {'error': 'Invalid to_date format. Use YYYY-MM-DD.'},
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

        report.append({
            'invoice_id': item.invoice.invoice_id,
            'booking_id': item.invoice.booking.booking_id,
            'invoice_date': item.invoice.invoice_date,
            'guest_name': (
                f"{item.invoice.booking.guest.first_name} "
                f"{item.invoice.booking.guest.last_name}"
            ),
            'description': item.description,
            'amount': float(amount),
        })

        total_addon_sales += amount

    return Response({
        'summary': {
            'total_addon_items': len(report),
            'total_addon_sales': float(total_addon_sales),
        },
        'add_ons': report,
    })
    
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_invoice(request, booking_id):
    from decimal import Decimal

    try:
        invoice = Invoice.objects.get(booking_id=booking_id)
    except Invoice.DoesNotExist:
        return Response(
            {'error': 'Invoice not found for this booking.'},
            status=status.HTTP_404_NOT_FOUND
        )

    extra_charges = request.data.get('extra_charges', [])

    try:
        # Remove the existing add-ons first.
        invoice.items.all().delete()

        # Add the current add-ons.
        for charge in extra_charges:
            description = str(
                charge.get('description', '')
            ).strip()

            try:
                amount = Decimal(str(charge.get('amount', 0)))
            except (ValueError, TypeError):
                continue

            if description and amount > 0:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=description,
                    amount=amount
                )

        # Recalculate invoice totals.
        extra_charges_total = sum(
            (
                item.amount
                for item in invoice.items.all()
            ),
            Decimal('0.00')
        )

        room_amount = (
            Decimal(invoice.room_nights)
            * invoice.room_rate
        )

        subtotal = room_amount + extra_charges_total
        gst_amount = subtotal * Decimal('0.05')
        total_amount = subtotal + gst_amount

        invoice.subtotal = subtotal
        invoice.gst_amount = gst_amount
        invoice.total_amount = total_amount
        invoice.save(
            update_fields=[
                'subtotal',
                'gst_amount',
                'total_amount'
            ]
        )

        return Response({
            'message': 'Invoice updated successfully.',
            'invoice_id': invoice.invoice_id,
            'booking_id': invoice.booking.booking_id,
            'subtotal': float(invoice.subtotal),
            'gst_amount': float(invoice.gst_amount),
            'total_amount': float(invoice.total_amount),
            'items': [
                {
                    'invoice_item_id': item.invoice_item_id,
                    'description': item.description,
                    'amount': float(item.amount),
                }
                for item in invoice.items.all()
            ],
        })

    except Exception as error:
        return Response(
            {'error': str(error)},
            status=status.HTTP_400_BAD_REQUEST
        )

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        data['is_staff'] = self.user.is_staff
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name

        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class HotelViewSet(viewsets.ModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class RoomsViewSet(viewsets.ModelViewSet):
    queryset = Rooms.objects.all()
    serializer_class = RoomsSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(hotel_id=1)

class GuestsViewSet(viewsets.ModelViewSet):
    queryset = Guests.objects.all()
    serializer_class = GuestsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Guests.objects.all()
        return Guests.objects.filter(user=self.request.user)

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Staff can see all bookings
        if user.is_staff or user.is_superuser:
            return Bookings.objects.all()
        
        # Regular users only see bookings linked to their Guest profile
        return Bookings.objects.filter(guest__user=user)

    def perform_create(self, serializer):
        room = serializer.validated_data['room']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']

        target_guest_id = self.request.data.get('guest') or self.request.data.get('guest_id')

        if self.request.user.is_staff:
            if target_guest_id:
                # 1. Staff attaching an existing guest record
                try:
                    guest_instance = Guests.objects.get(pk=target_guest_id)
                except Guests.DoesNotExist:
                    raise ValidationError({"guest": "The specified guest does not exist."})
            else:
                # 2. Staff creating a new walk-in guest on the fly without a User account
                guest_email = self.request.data.get('email')
                if not guest_email:
                    raise ValidationError({"email": "Email is required to record a walk-in booking."})

                guest_instance, _ = Guests.objects.get_or_create(
                    email=guest_email,
                    defaults={
                        'user': None,  # Decoupled from User account
                        'first_name': self.request.data.get('first_name', 'Walk-in'),
                        'last_name': self.request.data.get('last_name', 'Guest'),
                        'phone_number': self.request.data.get('phone_number', ''),
                        'id_document': self.request.data.get('id_document', '')
                    }
                )
        else:
            # 3. Standard online booking for logged-in users
            try:
                guest_instance = Guests.objects.get(user=self.request.user)
            except Guests.DoesNotExist:
                raise ValidationError({"detail": "No guest profile found for this user account."})

        nights = (check_out - check_in).days
        total_price = nights * getattr(room, 'price', getattr(room, 'price_per_night', 0))

        try:
            serializer.save(
                guest=guest_instance,
                total_price=total_price,
                status='Confirmed'
            )
        except IntegrityError:
            raise ValidationError({
                "error": "This room is already booked for the selected dates. Please choose different dates."
            })
            
            
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True, 
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Directs the user to your Next.js frontend reset page
            reset_link = f"http://localhost:3000/auth/reset-password?uid={uid}&token={token}"
            
            # Prints the link straight to your terminal console for easy testing
            print("\n" + "="*50)
            print(f"PASSWORD RESET LINK FOR {email}:")
            print(reset_link)
            print("="*50 + "\n")
            
            send_mail(
                subject="Password Reset Request",
                message=f"Click the link below to reset your password:\n{reset_link}",
                from_email="noreply@hotelmanagement.com",
                recipient_list=[email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            # Security best practice: don't reveal if the email exists or not
            pass

        return Response(
            {'message': 'If an account with this email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        if not password or not confirm_password:
            return Response({'error': 'Both password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'The reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
            
            
            