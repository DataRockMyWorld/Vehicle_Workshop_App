from decimal import Decimal

from django.conf import settings
from django.db import models


class Promotion(models.Model):
    """
    Model representing a promotion. Use discount_percent for % off, or discount_amount for fixed off.
    """
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Percentage off (0-100). Use this OR discount_amount.",
    )
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Fixed amount off. Use this OR discount_percent.",
    )

    def __str__(self):
        return f"{self.title} ({self.start_date} - {self.end_date})"

    def compute_discount(self, subtotal):
        """Return discount amount for a given subtotal."""
        if self.discount_percent is not None and self.discount_percent > 0:
            return (subtotal * self.discount_percent / 100).quantize(Decimal("0.01"))
        if self.discount_amount is not None and self.discount_amount > 0:
            return min(self.discount_amount, subtotal)
        return Decimal("0")


class SMSBlast(models.Model):
    """Record of an SMS blast sent to customers (e.g. for a promotion)."""

    AUDIENCE_ALL = "all"
    AUDIENCE_OPT_IN = "opt_in"
    AUDIENCE_SITE = "site"

    AUDIENCE_CHOICES = [
        (AUDIENCE_ALL, "All customers"),
        (AUDIENCE_OPT_IN, "Opt-in only"),
        (AUDIENCE_SITE, "Site-specific"),
    ]

    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sms_blasts",
    )
    message = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_ALL)
    site = models.ForeignKey(
        "Site.Site",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sms_blasts",
        help_text="Required when audience=site.",
    )
    total_count = models.PositiveIntegerField(default=0, help_text="Customers matched by audience.")
    sent_count = models.PositiveIntegerField(default=0, help_text="SMS successfully sent.")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sms_blasts",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        promo = self.promotion.title if self.promotion else "Standalone"
        return f"SMS Blast {self.id} - {promo} ({self.sent_count}/{self.total_count})"
