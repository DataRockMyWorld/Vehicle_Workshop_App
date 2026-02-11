from rest_framework import serializers
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'


class InvoiceListSerializer(serializers.ModelSerializer):
    """List view: includes nested customer, vehicle, site for display without extra requests."""
    customer_name = serializers.SerializerMethodField()
    vehicle_display = serializers.SerializerMethodField()
    site_name = serializers.SerializerMethodField()
    service_request_display = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'display_number', 'service_request', 'service_request_display',
            'subtotal', 'discount_amount', 'total_cost',
            'paid', 'payment_method', 'created_at', 'updated_at',
            'customer_name', 'vehicle_display', 'site_name',
        ]

    def get_service_request_display(self, obj):
        sr = obj.service_request
        if not sr:
            return str(obj.service_request)
        return sr.display_number or str(sr.id)

    def get_customer_name(self, obj):
        sr = obj.service_request
        if not sr or not sr.customer:
            return '—'
        c = sr.customer
        return f"{c.first_name or ''} {c.last_name or ''}".strip() or '—'

    def get_vehicle_display(self, obj):
        sr = obj.service_request
        if not sr or not sr.vehicle:
            return 'Sales'
        v = sr.vehicle
        return f"{v.make or ''} {v.model or ''} ({v.license_plate or '—'})".strip() or '—'

    def get_site_name(self, obj):
        sr = obj.service_request
        if not sr or not sr.site:
            return '—'
        return sr.site.name or '—'