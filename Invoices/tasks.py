from celery import shared_task
from twilio.rest import Client
from django.conf import settings
from .models import Invoice



@shared_task
def notify_customer_of_invoice(invoice_id):
    """
    Notifies the customer of the generated invoice via SMS or WhatsApp.
    """
    invoice = Invoice.objects.get(id=invoice_id)
    service_request = invoice.service_request
    customer = service_request.customer

    message = (
        f"Dear {customer.first_name}, your service is complete. "
        f"The total cost is ${invoice.total_cost}. Please proceed to payment."
    )

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    client.messages.create(
        body=message,
        from_=settings.TWILIO_PHONE_NUMBER,
        to=customer.phone_number
    )
