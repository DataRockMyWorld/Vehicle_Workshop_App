from django.contrib import admin
from .models import Vehicle

# Register your models here.
@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['license_plate', 'model', 'year', 'make', 'customer']
    search_fields = ['license_plate', 'model', 'year']
    list_filter = ['model', 'year']
