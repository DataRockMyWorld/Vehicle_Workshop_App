from rest_framework import serializers

from .models import Promotion, SMSBlast


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ("id", "title", "description", "start_date", "end_date", "discount_percent", "discount_amount")


class SMSBlastSerializer(serializers.ModelSerializer):
    promotion_title = serializers.SerializerMethodField()

    def get_promotion_title(self, obj):
        return obj.promotion.title if obj.promotion else None

    class Meta:
        model = SMSBlast
        fields = (
            "id",
            "promotion",
            "promotion_title",
            "message",
            "audience",
            "site",
            "total_count",
            "sent_count",
            "created_at",
            "created_by",
        )
        read_only_fields = ("total_count", "sent_count", "created_at", "created_by")
