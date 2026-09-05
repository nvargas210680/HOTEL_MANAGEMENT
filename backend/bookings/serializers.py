from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Hotel, Rooms, Guests, Bookings


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser']


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
        extra_kwargs = {
            'picture': {'required': False, 'allow_null': True}
        }


class GuestsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guests
        fields = ['guest_id', 'user', 'first_name', 'last_name', 'email', 'phone_number', 'id_document']
        read_only_fields = ['guest_id']
        extra_kwargs = {
            'user': {'required': False, 'allow_null': True}
        }


class RegisterSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    id_document = serializers.CharField(write_only=True, required=False, allow_blank=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'id_document']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', '')
        id_document = validated_data.pop('id_document', '')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )

        # Check if an unlinked walk-in guest record already exists with this email
        existing_guest = Guests.objects.filter(email=user.email, user__isnull=True).first()

        if existing_guest:
            # Claim the existing walk-in record and update with registration details
            existing_guest.user = user
            existing_guest.first_name = first_name
            existing_guest.last_name = last_name
            if phone_number:
                existing_guest.phone_number = phone_number
            if id_document:
                existing_guest.id_document = id_document
            existing_guest.save()
        else:
            # Create a brand new guest profile if no walk-in record exists
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
        read_only_fields = ['booking_id', 'total_price', 'created_at', 'updated_at']
        extra_kwargs = {
            'guest': {'required': False, 'allow_null': True}
        }

    def validate(self, data):
        instance = getattr(self, 'instance', None)

        check_in = data.get('check_in_date', instance.check_in_date if instance else None)
        check_out = data.get('check_out_date', instance.check_out_date if instance else None)
        room = data.get('room', instance.room if instance else None)

        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({
                "check_out_date": "Check-out date must be after check-in date."
            })

        if room and check_in and check_out:
            overlapping_bookings = Bookings.objects.filter(
                room=room,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in
            )

            if instance:
                overlapping_bookings = overlapping_bookings.exclude(pk=instance.pk)

            if overlapping_bookings.exists():
                raise serializers.ValidationError({
                    "non_field_errors": "This room is already booked for the selected dates."
                })

        return data


class UserProfileSerializer(serializers.ModelSerializer):
    phone_number = serializers.SerializerMethodField()
    id_document = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'id_document']
        read_only_fields = ['email']

    def get_phone_number(self, obj):
        guest = Guests.objects.filter(user=obj).first()
        if not guest and obj.email:
            guest = Guests.objects.filter(email=obj.email).first()
        return guest.phone_number if guest else ""

    def get_id_document(self, obj):
        guest = Guests.objects.filter(user=obj).first()
        if not guest and obj.email:
            guest = Guests.objects.filter(email=obj.email).first()
        return guest.id_document if guest else ""

    def update(self, instance, validated_data):
        # 1. Update User basic information
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        # 2. Get incoming raw data for guest specific fields
        request_data = self.context.get('request').data if self.context.get('request') else {}
        phone_number = request_data.get('phone_number')
        id_document = request_data.get('id_document')

        # 3. Locate or construct linked Guests profile
        guest = Guests.objects.filter(user=instance).first()
        if not guest and instance.email:
            guest = Guests.objects.filter(email=instance.email).first()

        if guest:
            guest.user = instance
            guest.first_name = instance.first_name
            guest.last_name = instance.last_name
            if phone_number is not None:
                guest.phone_number = phone_number
            if id_document is not None:
                guest.id_document = id_document
            guest.save()
        else:
            Guests.objects.create(
                user=instance,
                first_name=instance.first_name,
                last_name=instance.last_name,
                email=instance.email,
                phone_number=phone_number or "",
                id_document=id_document or ""
            )

        return instance