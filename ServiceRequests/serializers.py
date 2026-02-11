from rest_framework import serializers
from .models import ServiceRequest, ProductUsage


class ServiceRequestSerializer(serializers.ModelSerializer):
    service_type_display = serializers.SerializerMethodField()
    transaction_type = serializers.CharField(required=False, read_only=False)

    class Meta:
        model = ServiceRequest
        fields = '__all__'
        read_only_fields = ['display_number']

    def get_service_type_display(self, obj):
        if not obj.service_type_id:
            return None
        st = getattr(obj, "service_type", None)
        if st:
            return f"{st.category.name} — {st.name}"
        return None
    
    def validate(self, data):
        """Validate transaction type consistency between sales and service requests."""
        vehicle = data.get('vehicle')
        service_type = data.get('service_type')
        labor_cost = data.get('labor_cost', 0)
        assigned_mechanic = data.get('assigned_mechanic')
        
        # For updates, get existing values
        if self.instance:
            vehicle = vehicle if vehicle is not None else self.instance.vehicle
            service_type = service_type if 'service_type' in data else self.instance.service_type
            assigned_mechanic = assigned_mechanic if 'assigned_mechanic' in data else self.instance.assigned_mechanic
        
        # Determine if this is a sale (no vehicle)
        is_sale = vehicle is None
        
        if is_sale:
            # Sales validation
            if service_type is not None:
                raise serializers.ValidationError({
                    'service_type': 'Sales cannot have a service type. Please set to null.'
                })
            if assigned_mechanic is not None:
                raise serializers.ValidationError({
                    'assigned_mechanic': 'Sales cannot have an assigned mechanic. Please set to null.'
                })
            if labor_cost and labor_cost > 0:
                raise serializers.ValidationError({
                    'labor_cost': 'Sales cannot have labor costs. Please set to 0.'
                })
        
        return data
    
    def create(self, validated_data):
        """Auto-set transaction_type based on vehicle presence."""
        vehicle = validated_data.get('vehicle')
        validated_data['transaction_type'] = 'sale' if vehicle is None else 'service'
        return super().create(validated_data)

class ProductUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductUsage
        fields = '__all__'
        
    
    def validate_quantity_used(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity used must be a positive integer.")
        return value
    