from django.db import models
from django.contrib.auth.models import User


class Guests(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    guest_id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    phone_number = models.CharField(max_length=20)
    id_document = models.CharField(max_length=50)

    class Meta:
        db_table = 'guests'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class RoomTypes(models.Model):
    room_type_id = models.AutoField(primary_key=True)
    hotel_id = models.IntegerField()
    name = models.CharField(max_length=100)
    bed_count = models.IntegerField()
    bed_type = models.CharField(max_length=50)
    price_per_night = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    inventory = models.PositiveIntegerField(default=1)
    picture = models.ImageField(
        upload_to='rooms/',
        blank=True,
        null=True
    )
    status = models.CharField(
        max_length=20,
        default='Available'
    )

    class Meta:
        db_table = 'room_types'

    def __str__(self):
        return f"{self.name} - {self.bed_type}"


class Rooms(models.Model):
    room_id = models.AutoField(primary_key=True)
    hotel_id = models.IntegerField()
    room_number = models.CharField(max_length=10, unique=True)
    bed_count = models.IntegerField()
    bed_type = models.CharField(max_length=50)
    price_type = models.CharField(max_length=50)
    price_per_night = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    status = models.CharField(
        max_length=20,
        default='Available'
    )
    picture = models.ImageField(
        upload_to='rooms/',
        blank=True,
        null=True
    )

    class Meta:
        db_table = 'rooms'

    def __str__(self):
        return f"Room {self.room_number} - {self.bed_type}"


class Bookings(models.Model):
    booking_id = models.AutoField(primary_key=True)

    guest = models.ForeignKey(
        Guests,
        on_delete=models.CASCADE
    )

    room = models.ForeignKey(
        Rooms,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    room_type = models.ForeignKey(
        RoomTypes,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='bookings'
    )

    check_in_date = models.DateField()
    check_out_date = models.DateField()

    actual_check_in_date = models.DateField(
        null=True,
        blank=True
    )

    actual_check_out_date = models.DateField(
        null=True,
        blank=True
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        default='Confirmed'
    )

    class Meta:
        db_table = 'bookings'

    def __str__(self):
        if self.room_type:
            return (
                f"Booking {self.booking_id}: "
                f"{self.guest} - {self.room_type.name}"
            )

        if self.room:
            return (
                f"Booking {self.booking_id}: "
                f"{self.guest} - Room {self.room.room_number}"
            )

        return f"Booking {self.booking_id}: {self.guest}"


class Hotel(models.Model):
    hotel_id = models.AutoField(primary_key=True)
    hotel_name = models.CharField(max_length=150)
    address = models.CharField(max_length=250)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    amenities = models.ManyToManyField(
        'Amenity',
        related_name='hotels',
        blank=True
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    class Meta:
        db_table = 'hotels'

    def __str__(self):
        return self.hotel_name


class Amenity(models.Model):
    amenity_id = models.AutoField(primary_key=True)
    amenity_name = models.CharField(max_length=100)

    class Meta:
        db_table = 'amenities'

    def __str__(self):
        return self.amenity_name


class Staff(models.Model):
    staff_id = models.AutoField(primary_key=True)
    hotel = models.ForeignKey(
        'Hotel',
        on_delete=models.CASCADE,
        related_name='staff_members'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    phone_number = models.CharField(max_length=20)
    role = models.CharField(max_length=50)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'staff'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    booking = models.OneToOneField(
        'Bookings',
        on_delete=models.CASCADE,
        related_name='payment',
        db_column='booking_id',
        null=True,
        blank=True
    )
    payment_date = models.DateField()
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Credit/Debit Card'),
    ]

    method = models.CharField(
        max_length=30,
        choices=METHOD_CHOICES,
        default='cash'
    )

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('refunded', 'Refunded'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return (
            f"Payment {self.payment_id} - "
            f"Booking {self.booking_id}"
        )

    from django.contrib.auth import get_user_model

    User = get_user_model()
    User._meta.get_field('email')._unique = True


class Invoice(models.Model):
    invoice_id = models.AutoField(primary_key=True)

    booking = models.OneToOneField(
        'Bookings',
        on_delete=models.CASCADE,
        related_name='invoice'
    )

    invoice_date = models.DateField()
    room_nights = models.PositiveIntegerField()
    room_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    gst_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        default='Completed'
    )

    class Meta:
        db_table = 'invoices'

    def __str__(self):
        return (
            f"Invoice {self.invoice_id} - "
            f"Booking {self.booking.booking_id}"
        )


class InvoiceItem(models.Model):
    invoice_item_id = models.AutoField(primary_key=True)

    invoice = models.ForeignKey(
        'Invoice',
        on_delete=models.CASCADE,
        related_name='items'
    )

    description = models.CharField(max_length=150)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    class Meta:
        db_table = 'invoice_items'

    def __str__(self):
        return f"{self.description} - ${self.amount}"