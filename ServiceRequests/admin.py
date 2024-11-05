from django.contrib import admin
from .models import ServiceRequest

@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ('customer', 'vehicle', 'description', 'assigned_mechanic', 'status')
    list_filter = ('status', 'customer')
    search_fields = ('customer__email', 'vehicle__vin')


# Register your models here.
