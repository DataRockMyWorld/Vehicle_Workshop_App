from decimal import Decimal

from django.db import models
from Customers.models import Customer
from Vehicles.models import Vehicle
from Mechanics.models import Mechanic
from Site.models import Site
from Products.models import Product


class ServiceCategory(models.Model):
    """Broad category: Mechanical, Electrical, Bodywork, etc."""
    name = models.CharField(max_length=80, unique=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Service categories"

    def __str__(self):
        return self.name


class ServiceType(models.Model):
    """Specific service type under a category, e.g. Brake Repair under Mechanical."""
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name="service_types")
    name = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["category", "order", "name"]
        unique_together = [["category", "name"]]

    def __str__(self):
        return f"{self.category.name} — {self.name}"


class ServiceRequest(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Optional for walk-in parts sales (no vehicle work)",
    )
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="service_requests")
    service_type = models.ForeignKey(
        "ServiceType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_requests",
        help_text="Category and type of service (e.g. Mechanical — Brake Repair)",
    )
    description = models.TextField(help_text="Additional details and notes")
    assigned_mechanic = models.ForeignKey(Mechanic, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('In Progress', 'In Progress'), ('Completed', 'Completed')])
    product_used = models.ManyToManyField(Product, through='ProductUsage')
    labor_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0"),
        help_text="Workmanship / servicing labor cost for this job",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.vehicle_id:
            return f"Service Request for {self.vehicle} - {self.status}"
        return f"Parts sale - {self.status}"

class ProductUsage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    service_request = models.ForeignKey('ServiceRequest', on_delete=models.CASCADE)
    quantity_used = models.PositiveIntegerField()
