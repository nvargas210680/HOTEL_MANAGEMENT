from django.shortcuts import render
from rest_framework import viewsets, generics, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError


from .models import Hotel, Rooms, Guests, Bookings


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
    queryset = Bookings.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        room = serializer.validated_data['room']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']
        
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

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def booked_dates(self, request):
        room_id = request.query_params.get('room_id')
        if not room_id:
            return Response({"error": "room_id query parameter is required"}, status=400)

        # Retrieve active confirmed bookings for the requested room
        bookings = Bookings.objects.filter(
            room_id=room_id, 
            status='Confirmed'
        ).values('check_in_date', 'check_out_date')

        return Response(list(bookings))
    


