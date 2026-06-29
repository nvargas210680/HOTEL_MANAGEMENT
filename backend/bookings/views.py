from django.shortcuts import render
from rest_framework import viewsets
from .models import Hotel
from .serializers import HotelSerializer
from .models import Rooms
from .serializers import RoomsSerializer

class HotelViewSet(viewsets.ModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer

class RoomsViewSet(viewsets.ModelViewSet):
    queryset = Rooms.objects.all()
    serializer_class = RoomsSerializer
# Create your views here.
