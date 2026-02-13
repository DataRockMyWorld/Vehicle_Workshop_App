# promotions/tasks.py

from datetime import date

from celery import shared_task

from core.messaging import send_sms
from Customers.models import Customer
from .models import Promotion


@shared_task
def send_promotional_notifications():
    """
    Send SMS notifications to customers about active promotions.
    Uses core.messaging.send_sms (console in dev, Twilio when USE_TWILIO_SMS=True).
    """
    today = date.today()
    active_promotions = Promotion.objects.filter(
        start_date__lte=today, end_date__gte=today
    )
    if not active_promotions.exists():
        return
    message = "Special Offer! "
    for promo in active_promotions:
        message += f"{promo.title}: {promo.description}\n"
    for customer in Customer.objects.only("phone_number", "first_name"):
        send_sms(customer.phone_number, message.strip(), context="promo")
