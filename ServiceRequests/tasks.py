

from celery import shared_task
from datetime import datetime, timedelta
from twilio.rest import Client
from django.conf import settings
from .models import ServiceRequest, ProductUsage
from Invoices.models import Invoice

@shared_task
def send_service_reminder():
    """
    Sends SMS/WhatsApp service reminder notifications to customers whose vehicles are due for service.
    """
    due_date = datetime.now() - timedelta(days=180)  # Example: 6 months interval
    due_services = ServiceRequest.objects.filter(
        vehicle__last_serviced__lte=due_date,
        status='Completed'
    )

    # Initialize Twilio client
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    for service in due_services:
        customer_phone = service.customer.phone_number
        message = f"Dear {service.customer.first_name}, your vehicle is due for servicing. Please schedule a visit soon."

        # Send SMS
        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=customer_phone
        )

        # If using WhatsApp, change `to` to a WhatsApp-enabled number format
        # Uncomment below for WhatsApp, but note customer number format: 'whatsapp:+1234567890'
        # client.messages.create(
        #     body=message,
        #     from_='whatsapp:' + settings.TWILIO_PHONE_NUMBER,
        #     to='whatsapp:' + customer_phone
        # )


# services/tasks.py

@shared_task
def notify_mechanic_assignment(service_request_id):
    """
    Sends SMS/WhatsApp notification to the mechanic when a service request is assigned.
    """
    from .models import ServiceRequest
    from twilio.rest import Client
    from django.conf import settings

    # Retrieve service request details
    service_request = ServiceRequest.objects.get(id=service_request_id)
    mechanic = service_request.assigned_mechanic
    vehicle = service_request.vehicle
    customer = service_request.customer

    # Initialize Twilio client
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    # Mechanic message
    message = (
        f"Hello {mechanic.name}, you have been assigned a new service request.\n"
        f"Customer: {customer.first_name} {customer.last_name}\n"
        f"Vehicle: {vehicle.make} {vehicle.model} ({vehicle.license_plate})\n"
        f"Description: {service_request.description}"
    )

    # Send SMS to the mechanic's phone number
    client.messages.create(
        body=message,
        from_=settings.TWILIO_PHONE_NUMBER,
        to=mechanic.phone_number
    )

    # Uncomment below for WhatsApp, and format mechanic's phone as 'whatsapp:+1234567890'
    # client.messages.create(
    #     body=message,
    #     from_='whatsapp:' + settings.TWILIO_PHONE_NUMBER,
    #     to='whatsapp:' + mechanic.phone_number
    # )


# services/tasks.py

@shared_task
def adjust_inventory(service_request_id):
    """
    Adjusts inventory quantities based on products used in a completed service.
    """
    service_request = ServiceRequest.objects.get(id=service_request_id)
    product_usages = ProductUsage.objects.filter(service_request=service_request)

    for usage in product_usages:
        product = usage.product
        if product.inventory.quantity >= usage.quantity_used:
            product.inventory.quantity -= usage.quantity_used
            product.inventory.save()
        else:
            raise ValueError(f"Insufficient inventory for {product.name}")

def complete_service(service_request_id):
    """
    Completes the service request, adjusts inventory, and triggers invoice generation.
    """
    service_request = ServiceRequest.objects.get(id=service_request_id)
    if service_request.status != 'Completed':
        service_request.status = 'Completed'
        service_request.save()
        adjust_inventory(service_request_id)  # Adjust inventory
        generate_invoice(service_request_id)  # Trigger invoice

@shared_task
def generate_invoice(service_request_id):
    """
    Generates an invoice for the completed service request.
    """
    service_request = ServiceRequest.objects.get(id=service_request_id)
    total_cost = 0

    # Calculate cost from products used
    product_usages = ProductUsage.objects.filter(service_request=service_request)
    for usage in product_usages:
        total_cost += usage.product.unit_price * usage.quantity_used

    # Calculate service cost if applicable
    # Assuming each service type has a predefined cost, add that here if necessary

    # Create the invoice
    invoice = Invoice.objects.create(
        service_request=service_request,
        total_cost=total_cost,
    )
    return invoice