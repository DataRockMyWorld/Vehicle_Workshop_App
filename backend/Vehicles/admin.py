from django.contrib import admin
from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("license_plate", "make", "model", "year", "customer", "site", "last_serviced", "service_interval_days", "last_reminder_sent")
    list_filter = ("site", "year", "make")
    search_fields = ("license_plate", "make", "model", "customer__first_name", "customer__last_name")
    autocomplete_fields = ["customer", "site"]
    ordering = ("-id",)
