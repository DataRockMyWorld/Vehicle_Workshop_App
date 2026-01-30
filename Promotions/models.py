from decimal import Decimal

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
