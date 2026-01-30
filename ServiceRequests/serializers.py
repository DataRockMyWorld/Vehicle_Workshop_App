from rest_framework import serializers
from .models import ServiceRequest, ProductUsage


class ServiceRequestSerializer(serializers.ModelSerializer):
    service_type_display = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = '__all__'

    def get_service_type_display(self, obj):
        if not obj.service_type_id:
            return None
        st = getattr(obj, "service_type", None)
        if st:
            return f"{st.category.name} — {st.name}"
        return None

class ProductUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductUsage
        fields = '__all__'
        
    
    def validate_quantity_used(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity used must be a positive integer.")
        return value
    