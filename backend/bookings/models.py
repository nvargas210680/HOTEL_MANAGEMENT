from django.db import models
from django.contrib.auth.models import User

class Guests(models.Model):
    # Django usually uses 'id', but we can map it to your 'guest_id'
    guest_id = models.AutoField(primary_key=True) 
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    phone_number = models.CharField(max_length=20)
    id_document = models.CharField(max_length=50)

    class Meta:
        db_table = 'guests'  # This MUST match your SQL table name exactly

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

# Create your models here.
class Rooms(models.Model):
    room_id = models.AutoField(primary_key=True)
    hotel_id = models.IntegerField() # We will link this to a Hotel model later!
    room_number = models.CharField(max_length=10, unique=True)
    bed_count = models.IntegerField()
    bed_type = models.CharField(max_length=50)
    price_type = models.CharField(max_length=50)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='Available')
    picture = models.URLField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'rooms' # Matches your PostgreSQL table name

    def __str__(self):
        return f"Room {self.room_number} - {self.bed_type}"
    
class Bookings(models.Model):
    booking_id = models.AutoField(primary_key=True)
    # This connects to your Guests model
    guest = models.ForeignKey(Guests, on_delete=models.CASCADE)
    # This connects to your Rooms model
    room = models.ForeignKey(Rooms, on_delete=models.CASCADE)
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='Confirmed')

    class Meta:
        db_table = 'bookings'

    def __str__(self):
        return f"Booking {self.booking_id}: {self.guest} - Room {self.room.room_number}"
    
class Hotel(models.Model):
    hotel_id = models.AutoField(primary_key=True)
    hotel_name = models.CharField(max_length=150)
    address = models.CharField(max_length=250)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    amenities = models.ManyToManyField('Amenity', related_name='hotels', blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
   

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
    hotel = models.ForeignKey('Hotel', on_delete=models.CASCADE, related_name='staff_members')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    phone_number = models.CharField(max_length=20)
    role = models.CharField(max_length=50)

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile', null=True, blank=True)

    class Meta:
        db_table = 'staff'  # This MUST match your SQL table name exactly

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    

class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    booking = models.OneToOneField(
        'Bookings', 
        on_delete=models.CASCADE, 
        related_name='payment',
        db_column='booking_id',
        null=True,   # <--- ADD THIS
        blank=True   # <--- ADD THIS
    )
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Credit/Debit Card'),
        
    ]
    method = models.CharField(max_length=30, choices=METHOD_CHOICES, default='cash')
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('refunded', 'Refunded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return f"Payment {self.payment_id} - Booking {self.booking_id}"
    
    from django.contrib.auth import get_user_model

    User = get_user_model()
    # This forces the email field to have a unique constraint at the database level
    User._meta.get_field('email')._unique = True


