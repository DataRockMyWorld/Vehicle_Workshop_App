from rest_framework import serializers
from .models import ServiceRequest, ProductUsage

class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = '__all__'

class ProductUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductUsage
        fields = '__all__'
        
    
    def validate_quantity_used(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity used must be a positive integer.")
        return value
    