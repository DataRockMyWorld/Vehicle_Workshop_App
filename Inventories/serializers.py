from rest_framework import serializers
from .models import Inventory, InventoryTransaction


def _non_negative(value, name="value"):
    if value is not None and value < 0:
        raise serializers.ValidationError(f"{name} cannot be negative.")
    return value


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
