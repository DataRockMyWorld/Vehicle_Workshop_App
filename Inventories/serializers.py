from rest_framework import serializers
from .models import Inventory, InventoryTransaction


def _non_negative(value, name="value"):
    if value is not None and value < 0:
        raise serializers.ValidationError(f"{name} cannot be negative.")
    return value


class InventoryListSerializer(serializers.ModelSerializer):
    """List view with embedded product/site details for fast display and search results."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True, allow_null=True)
    product_category = serializers.CharField(source="product.category", read_only=True)
    product_unit = serializers.CharField(source="product.unit_of_measure", read_only=True)
    product_fmsi = serializers.CharField(source="product.fmsi_number", read_only=True, allow_null=True)
    product_brand = serializers.CharField(source="product.brand", read_only=True, allow_blank=True)
    product_part_number = serializers.CharField(source="product.part_number", read_only=True, allow_blank=True)
    site_name = serializers.CharField(source="site.name", read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "id", "product", "site",
            "product_name", "product_sku", "product_category", "product_unit",
            "product_fmsi", "product_brand", "product_part_number", "site_name",
            "quantity_on_hand", "quantity_reserved", "reorder_level", "reorder_quantity",
            "bin_location", "last_counted_at", "last_restocked_at",
        ]


class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = "__all__"
        read_only_fields = ("last_counted_at", "last_restocked_at")

    def validate_quantity_on_hand(self, value):
        return _non_negative(value, "Quantity on hand")

    def validate_quantity_reserved(self, value):
        return _non_negative(value, "Quantity reserved")

    def validate_reorder_level(self, value):
        return _non_negative(value, "Reorder level")

    def validate_reorder_quantity(self, value):
        return _non_negative(value, "Reorder quantity")

    def validate(self, attrs):
        on_hand = attrs.get("quantity_on_hand", getattr(self.instance, "quantity_on_hand", 0))
        reserved = attrs.get("quantity_reserved", getattr(self.instance, "quantity_reserved", 0))
        if reserved > on_hand:
            raise serializers.ValidationError({"quantity_reserved": "Reserved cannot exceed quantity on hand."})
        return attrs


class InventoryTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryTransaction
        fields = "__all__"
        read_only_fields = ("created_at", "created_by")
