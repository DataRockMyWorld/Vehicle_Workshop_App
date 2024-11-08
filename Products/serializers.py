from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        
    def validate_unit_price(self, value):
        request = self.context.get('request')
        if not request.user.is_superuser:
            raise serializers.ValidationError("Only superusers can modify unit price.")
        return value