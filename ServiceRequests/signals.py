# ServiceRequests/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ServiceRequest

@receiver(post_save, sender=ServiceRequest)
def notify_mechanic_on_assignment(sender, instance, created, **kwargs):
    if instance.assigned_mechanic and not created:
        # Import task here to avoid circular dependency
        from .tasks import notify_mechanic_assignment
        notify_mechanic_assignment.delay(instance.id)
