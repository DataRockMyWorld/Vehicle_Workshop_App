from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        "id", "customer", "vehicle", "site", "mechanic",
        "scheduled_date", "scheduled_time", "status",
    ]
    list_filter = ["status", "site", "scheduled_date"]
    search_fields = ["customer__first_name", "customer__last_name", "vehicle__license_plate"]
    raw_id_fields = ["customer", "vehicle", "mechanic", "service_request"]
    date_hierarchy = "scheduled_date"
