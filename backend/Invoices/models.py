from decimal import Decimal

from django.db import models

from common.models import get_next_display_number
from ServiceRequests.models import ServiceRequest


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    MOMO = "momo", "MoMo (Mobile Money)"
    POS = "pos", "POS (Card)"


class Invoice(models.Model):
    display_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        db_index=True,
        help_text="Human-readable ID, e.g. INV-2025-00001",
    )
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE)
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0"),
        help_text="Amount before discount",
    )
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0"),
        help_text="Amount discounted",
    )
    total_cost = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Final amount (subtotal - discount)",
    )
    promotion = models.ForeignKey(
        "Promotions.Promotion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    paid = models.BooleanField(default=False)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True,
        null=True,
        help_text="How the customer paid (when paid=True)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice {self.display_number or self.id} - Paid: {self.paid}"

    def save(self, *args, **kwargs):
        if not self.display_number:
            self.display_number = get_next_display_number("INV", pad=5)
        super().save(*args, **kwargs)
