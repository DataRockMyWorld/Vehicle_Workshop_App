from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["id", "action", "model_label", "object_id", "object_repr", "user", "created_at"]
    list_filter = ["action", "model_label"]
    search_fields = ["object_repr", "object_id"]
    readonly_fields = ["action", "model_label", "object_id", "object_repr", "changes_json", "user", "created_at"]
    date_hierarchy = "created_at"
