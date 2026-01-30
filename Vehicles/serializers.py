from rest_framework import serializers
from .models import Vehicle

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'customer', 'make', 'model', 'year', 'license_plate', 'site', 'last_serviced', 'service_interval_days', 'last_reminder_sent']

    def validate_license_plate(self, value):
        if Vehicle.objects.filter(license_plate=value).exists():
            raise serializers.ValidationError("This license plate already exists.")
        return value
