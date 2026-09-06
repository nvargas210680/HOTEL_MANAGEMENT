# Django imports
# Django core imports
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
from .models import Bookings, Guests, Hotel, Rooms
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
            
            
            