from rest_framework import serializers

from .models import Appointment
from Customers.serializers import CustomerSerializer
from Mechanics.serializers import MechanicSerializer
from Site.serializers import SiteSerializer
from Vehicles.serializers import VehicleSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    customer_detail = CustomerSerializer(source="customer", read_only=True)
    vehicle_detail = VehicleSerializer(source="vehicle", read_only=True)
    site_detail = SiteSerializer(source="site", read_only=True)
    mechanic_detail = MechanicSerializer(source="mechanic", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "customer",
            "customer_detail",
            "vehicle",
            "vehicle_detail",
            "site",
            "site_detail",
            "mechanic",
            "mechanic_detail",
            "scheduled_date",
            "scheduled_time",
            "duration_minutes",
            "status",
            "notes",
            "service_request",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "service_request"]
