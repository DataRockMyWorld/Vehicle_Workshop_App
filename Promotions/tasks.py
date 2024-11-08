# promotions/tasks.py

from celery import shared_task
from datetime import date
from twilio.rest import Client
from django.conf import settings
from .models import Promotion
from Customers.models import Customer  # Assuming Customer model is in `services`

@shared_task
def send_promotional_notifications():
    """
    Sends SMS/WhatsApp notifications to customers about active promotions.
    """
    # Fetch active promotions based on today's date
    today = date.today()
    active_promotions = Promotion.objects.filter(start_date__lte=today, end_date__gte=today)

    if not active_promotions.exists():
        return  # Exit if no promotions are active today

    # Build message with promotion details
    message = "Special Offer! "
    for promo in active_promotions:
        message += f"{promo.title}: {promo.description}\n"

    # Initialize Twilio client
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    # Send message to each customer
    customers = Customer.objects.all()
    for customer in customers:
        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=customer.phone_number
        )

        # Uncomment below to send via WhatsApp
        # client.messages.create(
        #     body=message,
        #     from_='whatsapp:' + settings.TWILIO_PHONE_NUMBER,
        #     to='whatsapp:' + customer.phone_number
        # )
