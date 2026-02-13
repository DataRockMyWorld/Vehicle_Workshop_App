from django.contrib import admin
from .models import Promotion, SMSBlast


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ("title", "discount_percent", "discount_amount", "start_date", "end_date")
    list_filter = ("start_date", "end_date")
    search_fields = ("title", "description")
    date_hierarchy = "start_date"


@admin.register(SMSBlast)
class SMSBlastAdmin(admin.ModelAdmin):
    list_display = ("id", "promotion", "audience", "total_count", "sent_count", "created_at", "created_by")
    list_filter = ("audience", "created_at")
    readonly_fields = ("total_count", "sent_count", "created_at", "created_by")
