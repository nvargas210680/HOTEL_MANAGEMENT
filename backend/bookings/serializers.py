from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Hotel, Rooms, Guests, Bookings



class HotelSerializer(serializers.ModelSerializer):
    amenities = serializers.StringRelatedField(many=True)
    class Meta:
        model = Hotel
        
        fields = ['hotel_id', 'hotel_name', 'address', 'city', 'amenities']

class RoomsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rooms
        read_only_fields = ['hotel_id']
        fields = [
            'room_id',
            'room_number',
            'bed_count',
            'bed_type',
            'price_type',
            'price_per_night',
            'status',
            'picture'
        ]

class GuestsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guests
        fields = ['guest_id', 'user', 'first_name', 'last_name', 'email', 'phone_number', 'id_document']
        read_only_fields = ['guest_id', 'user']

class RegisterSerializer(serializers.ModelSerializer):
    
    phone_number = serializers.CharField(write_only=True)
    id_document = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'id_document']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # 1. Pop out the Guest profile fields from validated_data
        phone_number = validated_data.pop('phone_number')
        id_document = validated_data.pop('id_document')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')

        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )

        
        Guests.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            email=user.email,
            phone_number=phone_number,
            id_document=id_document
        )

        return user

class BookingSerializer(serializers.ModelSerializer):
    room_details = RoomsSerializer(source='room', read_only=True)

    class Meta:
        model = Bookings
        fields = '__all__'
        read_only_fields = ['id', 'guest', 'total_price', 'created_at', 'updated_at']
        
        
class AdminBookingSerializer(serializers.ModelSerializer):
        guest_name = serializers.SerializerMethodField()
        guest_email = serializers.ReadOnlyField(source='guest.email')
        room_number = serializers.ReadOnlyField(source='room.room_number')
        
        class Meta:
                model = Bookings
                fields = [
                    'booking_id', 
                    'guest_name', 
                    'guest_email', 
                    'room_number', 
                    'check_in_date', 
                    'check_out_date', 
                    'status', 
                    'total_price'
                ]
        
        def get_guest_name(self, obj):
                if obj.guest:
                    return f"{obj.guest.first_name} {obj.guest.last_name}".strip()
                return "Unknown Guest"