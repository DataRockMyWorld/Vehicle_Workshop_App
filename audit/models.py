from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Record of create/update/delete on audited models."""

    ACTIONS = (
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
    )

    action = models.CharField(max_length=10, choices=ACTIONS)
    model_label = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=200, blank=True)
    changes_json = models.TextField(
        default="{}",
        help_text="JSON object describing changed fields and values",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.model_label}#{self.object_id} by {self.user_id or '?'}"
