from decimal import Decimal

from django.db import models

from common.models import get_next_display_number
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
    TRANSACTION_TYPE_CHOICES = [
        ('sale', 'Sale'),
        ('service', 'Service Request'),
    ]
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        default='service',
        db_index=True,
        help_text="Type of transaction: sale (no vehicle) or service request (with vehicle)"
    )
    display_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        db_index=True,
        help_text="Human-readable ID, e.g. SALE-2025-0042 or SR-2025-0042",
    )
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
    
    STATUS_CHOICES = [
        ('Draft', 'Draft'),                # Being built, can be deleted
        ('Pending', 'Pending'),            # Awaiting work/payment
        ('In Progress', 'In Progress'),    # Work in progress
        ('Completed', 'Completed'),        # Finished and paid
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES,
        default='Pending',
        help_text="Current status of the transaction"
    )
    product_used = models.ManyToManyField(Product, through='ProductUsage')
    labor_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0"),
        help_text="Workmanship / servicing labor cost for this job",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        entity_type = "Sale" if self.transaction_type == 'sale' else "Service Request"
        return f"{entity_type} {self.display_number or self.id} - {self.status}"

    def clean(self):
        """Validate transaction type consistency."""
        from django.core.exceptions import ValidationError
        
        # Auto-determine transaction_type if not set
        if not self.transaction_type:
            self.transaction_type = 'sale' if self.vehicle_id is None else 'service'
        
        # Validate consistency
        if self.transaction_type == 'sale':
            if self.vehicle_id is not None:
                raise ValidationError("Sales cannot have an associated vehicle.")
            if self.service_type_id is not None:
                raise ValidationError("Sales cannot have a service type.")
            if self.assigned_mechanic_id is not None:
                raise ValidationError("Sales cannot have an assigned mechanic.")
            if self.labor_cost and self.labor_cost > 0:
                raise ValidationError("Sales cannot have labor costs.")
        elif self.transaction_type == 'service':
            if self.vehicle_id is None:
                raise ValidationError("Service requests must have an associated vehicle.")

    def save(self, *args, **kwargs):
        # Auto-populate transaction_type based on vehicle if not explicitly set
        if not self.transaction_type:
            self.transaction_type = 'sale' if self.vehicle_id is None else 'service'
        
        # Generate appropriate display number based on type
        if not self.display_number:
            prefix = "SALE" if self.transaction_type == 'sale' else "SR"
            self.display_number = get_next_display_number(prefix, pad=4)
        
        super().save(*args, **kwargs)

class ProductUsage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    service_request = models.ForeignKey('ServiceRequest', on_delete=models.CASCADE)
    quantity_used = models.PositiveIntegerField()
