from rest_framework import serializers
from .models import Hotel
from .models import Rooms

class HotelSerializer(serializers.ModelSerializer):
    amenities = serializers.StringRelatedField(many=True)
    class Meta:
        model = Hotel
        # We choose exactly which fields the Frontend is allowed to see
        fields = ['hotel_id', 'hotel_name', 'address', 'city', 'amenities']

class RoomsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rooms
        # We choose exactly which fields the Frontend is allowed to see
        fields = ['room_id', 'hotel_id', 'room_number', 'bed_count', 'bed_type', 'price_type', 'price_per_night', 'status', 'picture']