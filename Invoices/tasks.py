from celery import shared_task

from core.messaging import send_email, send_sms
from .models import Invoice


@shared_task
def notify_customer_of_invoice(invoice_id):
    """
    Notify the customer of the generated invoice via SMS and email.
    SMS: console in dev, Twilio when USE_TWILIO_SMS=True.
    Email: logged to terminal for now.
    """
    invoice = Invoice.objects.select_related(
        "service_request", "service_request__customer", "service_request__vehicle"
    ).get(id=invoice_id)
    customer = invoice.service_request.customer
    vehicle = invoice.service_request.vehicle
    message = (
        f"Dear {customer.first_name}, your service is complete. "
        f"The total cost is GH₵{invoice.total_cost}. Please proceed to payment."
    )
    send_sms(customer.phone_number, message, context="invoice")
    email = (customer.email or "").strip()
    if email:
        subject = f"Invoice #{invoice.id} - {vehicle.make} {vehicle.model}"
        body = (
            f"Dear {customer.first_name},\n\n"
            f"Your service for {vehicle.make} {vehicle.model} ({vehicle.license_plate}) is complete.\n"
            f"Total amount: GH₵{invoice.total_cost}\n\n"
            f"Please proceed to payment at your earliest convenience.\n\n"
            f"Thank you."
        )
        send_email(email, subject, body, context="invoice")
