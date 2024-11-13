from django.contrib import admin
from .models import Vehicle

# Register your models here.
@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['id', 'license_plate', 'model', 'year', 'make', 'customer', 'site', 'last_serviced']
    search_fields = ['license_plate', 'model', 'year']
    list_filter = ['model', 'year']
