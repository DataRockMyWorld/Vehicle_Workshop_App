from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None
        
    def validate_unit_price(self, value):
        request = self.context.get('request')
        if not request.user.is_superuser:
            raise serializers.ValidationError("Only superusers can modify unit price.")
        return value