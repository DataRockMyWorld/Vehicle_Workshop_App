from django.contrib import admin
from .models import ServiceRequest, ProductUsage, ServiceCategory, ServiceType


class ServiceTypeInline(admin.TabularInline):
    model = ServiceType
    extra = 1
    ordering = ["order", "name"]


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "order")
    ordering = ("order", "name")
    inlines = [ServiceTypeInline]


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "order")
    list_filter = ("category",)
    search_fields = ("name", "category__name")
    ordering = ("category", "order", "name")


class ProductUsageInline(admin.TabularInline):
    model = ProductUsage
    extra = 0
    autocomplete_fields = ["product"]


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "display_number", "customer", "vehicle", "site", "service_type", "status", "labor_cost", "assigned_mechanic", "created_at")
    list_filter = ("status", "site", "created_at")
    search_fields = (
        "customer__first_name",
        "customer__last_name",
        "customer__email",
        "vehicle__license_plate",
        "vehicle__make",
        "vehicle__model",
        "description",
    )
    autocomplete_fields = ["customer", "vehicle", "site", "assigned_mechanic", "service_type"]
    readonly_fields = ("created_at", "display_number")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    inlines = [ProductUsageInline]


@admin.register(ProductUsage)
class ProductUsageAdmin(admin.ModelAdmin):
    list_display = ("service_request", "product", "quantity_used")
    list_filter = ("product__category",)
    search_fields = ("product__name", "product__sku", "service_request__id")
    autocomplete_fields = ["product", "service_request"]
