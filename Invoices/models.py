from decimal import Decimal

from django.db import models

from ServiceRequests.models import ServiceRequest


class Invoice(models.Model):
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice for {self.service_request.vehicle} - Paid: {self.paid}"
