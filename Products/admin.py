from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
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
    list_filter = ("category", "is_active", "unit_of_measure")
    search_fields = ("name", "sku", "brand", "part_number")
    list_editable = ("is_active",)
    ordering = ("name",)

    def margin_display(self, obj):
        m = obj.margin_percent
        return f"{m}%" if m is not None else "—"

    margin_display.short_description = "Margin %"
