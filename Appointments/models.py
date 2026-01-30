from django.db import models

from Customers.models import Customer
from Mechanics.models import Mechanic
from Site.models import Site
from Vehicles.models import Vehicle


class AppointmentStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    CONFIRMED = "confirmed", "Confirmed"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    NO_SHOW = "no_show", "No Show"


class Appointment(models.Model):
    """Service slot booking with optional mechanic assignment."""

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="appointments")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="appointments")
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="appointments")
    mechanic = models.ForeignKey(
        Mechanic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
        help_text="Optional: assign a mechanic in advance.",
    )
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Expected slot duration in minutes.",
    )
    status = models.CharField(
        max_length=20,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.SCHEDULED,
    )
    notes = models.TextField(blank=True)
    service_request = models.ForeignKey(
        "ServiceRequests.ServiceRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
        help_text="Linked when converted to a service request.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_date", "scheduled_time"]

    def __str__(self):
        return f"{self.customer} - {self.scheduled_date} {self.scheduled_time} ({self.get_status_display()})"
