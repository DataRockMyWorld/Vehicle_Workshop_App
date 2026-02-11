from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "display_number", "service_request", "total_cost", "paid", "payment_method", "created_at", "updated_at")
    list_filter = ("paid", "payment_method", "created_at")
    search_fields = (
        "service_request__id",
        "service_request__customer__first_name",
        "service_request__customer__last_name",
        "service_request__vehicle__license_plate",
    )
    autocomplete_fields = ["service_request"]
    readonly_fields = ("created_at", "updated_at", "display_number")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
