from django.conf import settings

from celery import shared_task

from core.messaging import send_email, send_sms
from .models import Invoice


def _invoice_pdf_url(invoice_id):
    base = getattr(settings, "APP_BASE_URL", "http://localhost:8000").rstrip("/")
    return f"{base}/api/v1/invoices/{invoice_id}/pdf/"


def _receipt_url(invoice_id):
    base = getattr(settings, "APP_BASE_URL", "http://localhost:8000").rstrip("/")
    return f"{base}/api/v1/invoices/{invoice_id}/receipt/"


@shared_task
def notify_customer_of_invoice(invoice_id):
    """
    Notify the customer of the generated invoice via SMS and email.
    SMS: console in dev, Twilio when USE_TWILIO_SMS=True.
    Email: logged to terminal for now.
    """
    try:
        invoice = Invoice.objects.select_related(
            "service_request", "service_request__customer", "service_request__vehicle"
        ).get(id=invoice_id)
    except Invoice.DoesNotExist:
        import logging
        logging.warning(f"Invoice {invoice_id} not found for notification. Skipping.")
        return
    customer = invoice.service_request.customer
    vehicle = invoice.service_request.vehicle
    message = (
        f"Dear {customer.first_name}, your service is complete. "
        f"The total cost is GHC {invoice.total_cost}. Please proceed to payment."
    )
    send_sms(customer.phone_number, message, context="invoice")
    invoice_link = _invoice_pdf_url(invoice_id)
    email = (customer.email or "").strip()
    if email:
        if vehicle:
            subject = f"Invoice {invoice.display_number or invoice.id} - {vehicle.make} {vehicle.model}"
            body = (
                f"Dear {customer.first_name},\n\n"
                f"Your service for {vehicle.make} {vehicle.model} ({vehicle.license_plate}) is complete.\n"
                f"Total amount: GHC {invoice.total_cost}\n\n"
                f"View your invoice: {invoice_link}\n\n"
                f"Please proceed to payment at your earliest convenience.\n\nThank you."
            )
        else:
            subject = f"Invoice {invoice.display_number or invoice.id} - Sales"
            body = (
                f"Dear {customer.first_name},\n\n"
                f"Your parts order is complete.\n"
                f"Total amount: GHC {invoice.total_cost}\n\n"
                f"View your invoice: {invoice_link}\n\n"
                f"Please proceed to payment at your earliest convenience.\n\nThank you."
            )
        send_email(email, subject, body, context="invoice")


@shared_task
def notify_customer_of_receipt(invoice_id):
    """
    Notify the customer that payment was received (receipt) via SMS and email.
    Called when an invoice is marked as paid.
    """
    from .models import PaymentMethod

    try:
        invoice = Invoice.objects.select_related(
            "service_request", "service_request__customer", "service_request__vehicle"
        ).get(id=invoice_id)
    except Invoice.DoesNotExist:
        import logging
        logging.warning(f"Invoice {invoice_id} not found for receipt notification. Skipping.")
        return
    if not invoice.paid:
        return
    customer = invoice.service_request.customer
    vehicle = invoice.service_request.vehicle
    method_label = dict(PaymentMethod.choices).get(invoice.payment_method or "", invoice.payment_method or "—")
    message = (
        f"Dear {customer.first_name}, we have received your payment of GHC {invoice.total_cost} "
        f"({method_label}). Thank you!"
    )
    send_sms(customer.phone_number, message, context="receipt")
    receipt_link = _receipt_url(invoice_id)
    email = (customer.email or "").strip()
    if email:
        if vehicle:
            subject = f"Receipt {invoice.display_number or invoice.id} - Payment received"
            body = (
                f"Dear {customer.first_name},\n\n"
                f"We have received your payment for {vehicle.make} {vehicle.model} ({vehicle.license_plate}).\n"
                f"Amount paid: GHC {invoice.total_cost}\n"
                f"Payment method: {method_label}\n\n"
                f"Download your receipt: {receipt_link}\n\n"
                f"Thank you for your business!\n\n"
                f"Your vehicle is ready for pickup."
            )
        else:
            subject = f"Receipt {invoice.display_number or invoice.id} - Payment received"
            body = (
                f"Dear {customer.first_name},\n\n"
                f"We have received your payment for your parts order.\n"
                f"Amount paid: GHC {invoice.total_cost}\n"
                f"Payment method: {method_label}\n\n"
                f"Download your receipt: {receipt_link}\n\n"
                f"Thank you for your business!"
            )
        send_email(email, subject, body, context="receipt")
