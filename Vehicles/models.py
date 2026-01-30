from django.db import models
from Customers.models import Customer
from Site.models import Site

class Vehicle(models.Model):
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    license_plate = models.CharField(max_length=50)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="vehicles")
    last_serviced = models.DateField(null=True, blank=True)
    service_interval_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=180,
        help_text="Days between service reminders. Default 180 (6 months).",
    )
    last_reminder_sent = models.DateField(
        null=True,
        blank=True,
        help_text="Last date a service-due reminder was sent; avoids spam.",
    )
    
    def __str__(self):
        return f"{self.model} {self.make} {self.license_plate}"
    
