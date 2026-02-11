# ServiceRequests/signals.py

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import ServiceRequest


@receiver(pre_save, sender=ServiceRequest)
def _store_previous_assigned_mechanic(sender, instance, **kwargs):
    """Store previous assigned_mechanic_id so post_save can detect changes."""
    if instance.pk:
        try:
            old = ServiceRequest.objects.values_list("assigned_mechanic_id", flat=True).get(pk=instance.pk)
            instance._prev_assigned_mechanic_id = old
        except ServiceRequest.DoesNotExist:
            instance._prev_assigned_mechanic_id = None
    else:
        instance._prev_assigned_mechanic_id = None


@receiver(post_save, sender=ServiceRequest)
def notify_mechanic_on_assignment(sender, instance, created, **kwargs):
    """Notify mechanic only when assigned_mechanic actually changed."""
    if created:
        if instance.assigned_mechanic_id:
            from .tasks import notify_mechanic_assignment
            notify_mechanic_assignment.delay(instance.id)
        return
    prev = getattr(instance, "_prev_assigned_mechanic_id", None)
    if instance.assigned_mechanic_id and instance.assigned_mechanic_id != prev:
        from .tasks import notify_mechanic_assignment
        notify_mechanic_assignment.delay(instance.id)
