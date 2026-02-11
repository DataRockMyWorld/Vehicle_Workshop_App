from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Customer


@receiver(post_save, sender=Customer)
def notify_welcome_on_create(sender, instance, created, **kwargs):
    """Send welcome message when a new customer is registered."""
    if created and (instance.phone_number or instance.email):
        from .tasks import notify_welcome_customer
        notify_welcome_customer.delay(instance.id)
