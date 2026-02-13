from django.contrib import admin
from .models import Inventory, InventoryTransaction


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "site",
        "quantity_on_hand",
        "quantity_reserved",
        "available_display",
        "reorder_level",
        "reorder_quantity",
        "bin_location",
        "is_low_display",
        "restricted_edit",
    )
    list_filter = ("site", "product__category", "restricted_edit")
    search_fields = ("product__name", "product__sku", "product__part_number", "bin_location")
    raw_id_fields = ("product", "site")
    readonly_fields = ("last_counted_at", "last_restocked_at")

    def available_display(self, obj):
        return obj.available_quantity

    available_display.short_description = "Available"

    def is_low_display(self, obj):
        return obj.is_low_stock

    is_low_display.boolean = True
    is_low_display.short_description = "Low stock"


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "inventory", "transaction_type", "quantity", "reference_type", "reference_id", "created_at", "created_by")
    list_filter = ("transaction_type", "created_at")
    search_fields = ("inventory__product__name", "notes", "reference_type")
    raw_id_fields = ("inventory", "created_by")
    readonly_fields = ("created_at",)
