from django.contrib import admin
from .models import Guests, Rooms, Bookings, Hotel, Amenity, Staff, Payment


print("--- ATTEMPTING DECORATOR REGISTRATION ---")

@admin.register(Guests)
class GuestsAdmin(admin.ModelAdmin):
    # This tells Django which columns to show in the list view
    list_display = ('first_name', 'last_name', 'email')

     # Update the import

@admin.register(Rooms)
class RoomsAdmin(admin.ModelAdmin):
    list_display = ('room_number', 'bed_type', 'price_per_night', 'status')
    list_filter = ('status', 'bed_type') # Adds a sidebar to filter by status!

@admin.register(Bookings)
class BookingsAdmin(admin.ModelAdmin):
    list_display = ('booking_id', 'guest', 'room', 'check_in_date', 'status')
    list_filter = ('status', 'check_in_date')

@admin.register(Hotel) # Ensure this matches your model name (Hotel vs Hotels)
class HotelAdmin(admin.ModelAdmin):
    list_display = ('hotel_id', 'hotel_name', 'city', 'province', 'phone_number')
    
    # 2. Keep your filters
    list_filter = ('hotel_name', 'city') 

    # 3. ADD THIS: This creates the "Selection Box" at the bottom
    filter_horizontal = ('amenities',)  

@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ('amenity_id', 'amenity_name')
    list_filter = ('amenity_name',)

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email','phone_number', 'role')
    list_filter = ('hotel', 'role')
    search_fields = ('first_name', 'last_name', 'email')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'amount', 'method','status')
    list_filter = ('method', 'status', 'payment_date')
    search_fields = ('booking__hotel__hotel_name', 'status')
    date_hierarchy = 'payment_date'