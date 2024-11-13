from django.contrib import admin
from .models import ServiceRequest, ProductUsage

@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'vehicle', 'description', 'assigned_mechanic', 'status')
    list_filter = ('status', 'customer')
    search_fields = ('customer__email', 'vehicle__vin')


# Register your models here.
@admin.register(ProductUsage)
class ProductUsageAdmin(admin.ModelAdmin):
    list_display = ('product', 'service_request', 'quantity_used')
