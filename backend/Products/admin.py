from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    fieldsets = (
        (None, {"fields": ("name", "sku", "image", "description", "is_active")}),
        ("Identification", {"fields": ("fmsi_number", "product_type", "position", "part_number", "brand", "category")}),
        ("Vehicle fit", {"fields": ("application",)}),
        ("Pricing", {"fields": ("unit_price", "cost_price", "unit_of_measure")}),
    )
    list_display = (
        "name",
        "fmsi_number",
        "product_type",
        "position",
        "sku",
        "category",
        "brand",
        "part_number",
        "unit_of_measure",
        "unit_price",
        "cost_price",
        "margin_display",
        "is_active",
    )
    list_filter = ("category", "product_type", "is_active", "unit_of_measure")
    search_fields = ("name", "sku", "fmsi_number", "application", "brand", "part_number", "product_type")
    list_editable = ("is_active",)
    ordering = ("name",)

    def margin_display(self, obj):
        m = obj.margin_percent
        return f"{m}%" if m is not None else "—"

    margin_display.short_description = "Margin %"
