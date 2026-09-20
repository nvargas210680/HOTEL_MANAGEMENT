from rest_framework import serializers
from django.contrib.auth.models import User

from .models import (
    Hotel,
    Rooms,
    RoomTypes,
    Guests,
    Bookings,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_superuser',
        ]


class AdminBookingSerializer(serializers.ModelSerializer):
    guest_name = serializers.SerializerMethodField()
    guest_email = serializers.ReadOnlyField(source='guest.email')
    guest_phone = serializers.SerializerMethodField()
    id_document = serializers.SerializerMethodField()

    room_type_id = serializers.ReadOnlyField(
        source='room_type.room_type_id'
    )
    room_type_name = serializers.ReadOnlyField(
        source='room_type.name'
    )
    room_bed_type = serializers.ReadOnlyField(
        source='room_type.bed_type'
    )
    room_price_per_night = serializers.SerializerMethodField()

    class Meta:
        model = Bookings
        fields = [
            'booking_id',
            'guest_name',
            'guest_email',
            'guest_phone',
            'id_document',
            'room_type_id',
            'room_type_name',
            'room_bed_type',
            'room_price_per_night',
            'check_in_date',
            'check_out_date',
            'actual_check_in_date',
            'actual_check_out_date',
            'status',
            'total_price',
        ]

    def get_guest_name(self, obj):
        if obj.guest:
            return (
                f"{obj.guest.first_name} "
                f"{obj.guest.last_name}"
            ).strip()

        return "Unknown Guest"

    def get_guest_phone(self, obj):
        return obj.guest.phone_number if obj.guest else ""

    def get_id_document(self, obj):
        return obj.guest.id_document if obj.guest else ""

    def get_room_price_per_night(self, obj):
        if obj.room_type:
            return obj.room_type.price_per_night

        if obj.room:
            return obj.room.price_per_night

        return None


class HotelSerializer(serializers.ModelSerializer):
    amenities = serializers.StringRelatedField(many=True)

    class Meta:
        model = Hotel
        fields = [
            'hotel_id',
            'hotel_name',
            'address',
            'city',
            'amenities',
        ]


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
            'picture',
        ]
        extra_kwargs = {
            'picture': {
                'required': False,
                'allow_null': True,
            }
        }


class RoomTypesSerializer(serializers.ModelSerializer):
    available_inventory = serializers.IntegerField(
        read_only=True
    )

    class Meta:
        model = RoomTypes
        read_only_fields = [
            'room_type_id',
            'hotel_id',
            'available_inventory',
        ]
        fields = [
            'room_type_id',
            'name',
            'bed_count',
            'bed_type',
            'price_per_night',
            'inventory',
            'available_inventory',
            'status',
            'picture',
        ]
        extra_kwargs = {
            'picture': {
                'required': False,
                'allow_null': True,
            }
        }


class GuestsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guests
        fields = [
            'guest_id',
            'user',
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'id_document',
        ]
        read_only_fields = ['guest_id']
        extra_kwargs = {
            'user': {
                'required': False,
                'allow_null': True,
            }
        }


class RegisterSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )
    id_document = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'confirm_password',
            'first_name',
            'last_name',
            'phone_number',
            'id_document',
        ]
        extra_kwargs = {
            'password': {
                'write_only': True
            }
        }

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Passwords must match."
            })

        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')

        phone_number = validated_data.pop(
            'phone_number',
            ''
        )
        id_document = validated_data.pop(
            'id_document',
            ''
        )

        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )

        existing_guest = Guests.objects.filter(
            email=user.email,
            user__isnull=True
        ).first()

        if existing_guest:
            existing_guest.user = user
            existing_guest.first_name = first_name
            existing_guest.last_name = last_name

            if phone_number:
                existing_guest.phone_number = phone_number

            if id_document:
                existing_guest.id_document = id_document

            existing_guest.save()
        else:
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
    room_details = serializers.SerializerMethodField()

    class Meta:
        model = Bookings
        fields = '__all__'
        read_only_fields = [
            'booking_id',
            'total_price',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'guest': {
                'required': False,
                'allow_null': True,
            },
            'room': {
                'required': False,
                'allow_null': True,
            },
            'room_type': {
                'required': False,
                'allow_null': True,
            },
        }

    def get_room_details(self, obj):
        if obj.room_type:
            return {
                'room_type_id': obj.room_type.room_type_id,
                'name': obj.room_type.name,
                'bed_count': obj.room_type.bed_count,
                'bed_type': obj.room_type.bed_type,
                'price_per_night': obj.room_type.price_per_night,
                'inventory': obj.room_type.inventory,
                'picture': (
                    obj.room_type.picture.url
                    if obj.room_type.picture
                    else None
                ),
            }

        if obj.room:
            return {
                'room_id': obj.room.room_id,
                'room_number': obj.room.room_number,
                'bed_count': obj.room.bed_count,
                'bed_type': obj.room.bed_type,
                'price_type': obj.room.price_type,
                'price_per_night': obj.room.price_per_night,
                'status': obj.room.status,
                'picture': (
                    obj.room.picture.url
                    if obj.room.picture
                    else None
                ),
            }

        return None

    def validate(self, data):
        instance = getattr(self, 'instance', None)

        check_in = data.get(
            'check_in_date',
            instance.check_in_date if instance else None
        )

        check_out = data.get(
            'check_out_date',
            instance.check_out_date if instance else None
        )

        room_type = data.get(
            'room_type',
            instance.room_type if instance else None
        )

        room = data.get(
            'room',
            instance.room if instance else None
        )

        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({
                "check_out_date":
                    "Check-out date must be after check-in date."
            })

        if room_type and check_in and check_out:
            overlapping_bookings = Bookings.objects.filter(
                room_type=room_type,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            ).exclude(
                status='Cancelled'
            )

            if instance:
                overlapping_bookings = overlapping_bookings.exclude(
                    pk=instance.pk
                )

            if overlapping_bookings.count() >= room_type.inventory:
                raise serializers.ValidationError({
                    "non_field_errors":
                        "This room type is fully booked for "
                        "the selected dates."
                })

        elif room and check_in and check_out:
            overlapping_bookings = Bookings.objects.filter(
                room=room,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            ).exclude(
                status='Cancelled'
            )

            if instance:
                overlapping_bookings = overlapping_bookings.exclude(
                    pk=instance.pk
                )

            if overlapping_bookings.exists():
                raise serializers.ValidationError({
                    "non_field_errors":
                        "This room is already booked for "
                        "the selected dates."
                })

        return data


class UserProfileSerializer(serializers.ModelSerializer):
    phone_number = serializers.SerializerMethodField()
    id_document = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'username',
            'email',
            'phone_number',
            'id_document',
        ]
        read_only_fields = ['email']

    def get_phone_number(self, obj):
        guest = Guests.objects.filter(
            user=obj
        ).first()

        if not guest and obj.email:
            guest = Guests.objects.filter(
                email=obj.email
            ).first()

        return guest.phone_number if guest else ""

    def get_id_document(self, obj):
        guest = Guests.objects.filter(
            user=obj
        ).first()

        if not guest and obj.email:
            guest = Guests.objects.filter(
                email=obj.email
            ).first()

        return guest.id_document if guest else ""

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get(
            'first_name',
            instance.first_name
        )

        instance.last_name = validated_data.get(
            'last_name',
            instance.last_name
        )

        instance.username = validated_data.get(
            'username',
            instance.username
        )

        instance.save()

        request = self.context.get('request')

        request_data = (
            request.data
            if request
            else {}
        )

        phone_number = request_data.get('phone_number')
        id_document = request_data.get('id_document')

        guest = Guests.objects.filter(
            user=instance
        ).first()

        if not guest and instance.email:
            guest = Guests.objects.filter(
                email=instance.email
            ).first()

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