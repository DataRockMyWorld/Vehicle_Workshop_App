from rest_framework import serializers

from .models import Promotion


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ("id", "title", "description", "start_date", "end_date", "discount_percent", "discount_amount")
