from rest_framework import serializers
from .models import Hotel

class HotelSerializer(serializers.ModelSerializer):
    amenities = serializers.StringRelatedField(many=True)
    class Meta:
        model = Hotel
        # We choose exactly which fields the Frontend is allowed to see
        fields = ['hotel_id', 'hotel_name', 'address', 'city', 'amenities']

