from django.contrib import admin
from .models import Promotion


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ("title", "discount_percent", "discount_amount", "start_date", "end_date")
    list_filter = ("start_date", "end_date")
    search_fields = ("title", "description")
    date_hierarchy = "start_date"
