from django.shortcuts import render
from django.contrib.auth.models import User
from django.db import IntegrityError

from rest_framework import viewsets, generics, permissions, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Hotel, Rooms, Guests, Bookings

from .serializers import (
    HotelSerializer, 
    RoomsSerializer, 
    GuestsSerializer, 
    RegisterSerializer,
    BookingSerializer,
    AdminBookingSerializer
)

# --- ADMIN BOOKING VIEWS ---

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
    queryset = Bookings.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        print("REQUEST DATA:", self.request.data)
        room = serializer.validated_data['room']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']
        
        # 1. Check if an admin is passing an explicit guest ID for a walk-in
        target_guest_id = self.request.data.get('guest') or self.request.data.get('guest_id')

        if self.request.user.is_staff and target_guest_id:
            try:
                guest_instance = Guests.objects.get(pk=target_guest_id)
            except Guests.DoesNotExist:
                raise ValidationError({"guest": "The specified guest does not exist."})
        else:
            # 2. Fall back to standard user-to-guest mapping for regular customers
            guest_instance, _ = Guests.objects.get_or_create(
                user=self.request.user,
                defaults={
                    'first_name': self.request.user.first_name or self.request.user.username,
                    'last_name': self.request.user.last_name or '',
                    'email': self.request.user.email or ''
                }
            )

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