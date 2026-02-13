from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "first_name", "last_name", "phone_number", "email", "receive_service_reminders"]

    def validate_phone_number(self, value):
        if not value or not isinstance(value, str):
            raise serializers.ValidationError("Phone number is required.")
        cleaned = value.strip().replace(" ", "")
        if len(cleaned) < 6:
            raise serializers.ValidationError("Phone number must be at least 6 characters.")
        return cleaned