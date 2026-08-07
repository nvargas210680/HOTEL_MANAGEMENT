from django.shortcuts import render
from rest_framework import viewsets, generics
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# 1. Add Bookings model (plural)
from .models import Hotel, Rooms, Guests, Bookings

# 2. Add BookingSerializer
from .serializers import (
    HotelSerializer, 
    RoomsSerializer, 
    GuestsSerializer, 
    RegisterSerializer,
    BookingSerializer
)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Inject user details into the JSON response
        data['is_staff'] = self.user.is_staff
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    

class HotelViewSet(viewsets.ModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class RoomsViewSet(viewsets.ModelViewSet):
    queryset = Rooms.objects.all()
    serializer_class = RoomsSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class GuestsViewSet(viewsets.ModelViewSet):
    queryset = Guests.objects.all()
    serializer_class = GuestsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Guests.objects.all()
        return Guests.objects.filter(user=self.request.user)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
    serializer_class = RegisterSerializer
    
class GuestsViewSet(viewsets.ModelViewSet):
    queryset = Guests.objects.all()
    serializer_class = GuestsSerializer
    permission_classes = [IsAuthenticated]
    
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Booking.objects.all()

        return Bookings.objects.filter(guest__user=user)
    


