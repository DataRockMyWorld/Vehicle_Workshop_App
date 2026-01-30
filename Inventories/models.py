from django.db import models
from django.conf import settings
from Products.models import Product
from Site.models import Site


class Inventory(models.Model):
    """Stock on hand per product per site (workshop/shop)."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="inventory_records")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="inventory_records")
    quantity_on_hand = models.PositiveIntegerField(default=0)
    quantity_reserved = models.PositiveIntegerField(
        default=0,
        help_text="Reserved for in‑progress jobs, not yet used",
    )
    reorder_level = models.PositiveIntegerField(
        default=0,
        help_text="Alert when stock on hand falls at or below this",
    )
    reorder_quantity = models.PositiveIntegerField(
        default=0,
        help_text="Suggested order quantity when restocking",
    )
    bin_location = models.CharField(
        max_length=80,
        blank=True,
        help_text="Shelf/bin location in store or warehouse",
    )
    last_counted_at = models.DateTimeField(null=True, blank=True)
    last_restocked_at = models.DateTimeField(null=True, blank=True)
    restricted_edit = models.BooleanField(
        default=True,
        help_text="Only superusers can modify when True",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "site"], name="unique_product_site_inventory"),
        ]
        ordering = ["site", "product__name"]
        verbose_name_plural = "Inventories"

    def __str__(self):
        return f"{self.product.name} @ {self.site.name}: {self.quantity_on_hand}"

    @property
    def available_quantity(self):
        """Quantity available for use (on hand minus reserved)."""
        return max(0, self.quantity_on_hand - self.quantity_reserved)

    @property
    def is_low_stock(self):
        return self.reorder_level > 0 and self.quantity_on_hand <= self.reorder_level


class TransactionType(models.TextChoices):
    IN = "in", "Stock in (restock / purchase)"
    OUT = "out", "Stock out (sale / usage)"
    ADJUST = "adjust", "Adjustment"
    RETURN = "return", "Return"
    RESERVE = "reserve", "Reserve for job"
    RELEASE_RESERVE = "release_reserve", "Release reservation"
    COUNT = "count", "Stock count"


class InventoryTransaction(models.Model):
    """Audit trail for inventory movements."""

    inventory = models.ForeignKey(
        Inventory,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.IntegerField(help_text="Positive for IN/RETURN/RESERVE, negative for OUT/RELEASE; absolute for ADJUST/COUNT")
    reference_type = models.CharField(
        max_length=60,
        blank=True,
        help_text="e.g. product_usage, adjustment, purchase_order",
    )
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} {self.quantity} @ {self.created_at}"
