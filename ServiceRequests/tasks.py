

from decimal import Decimal
from datetime import datetime, date, timedelta

from celery import shared_task

from core.messaging import send_email, send_sms
from .models import ServiceRequest, ProductUsage
from Invoices.models import Invoice
from Vehicles.models import Vehicle


@shared_task
def send_service_reminder():
    """
    Send service reminder SMS/email to customers whose vehicles are due for service.
    Respects customer.receive_service_reminders and vehicle.service_interval_days.
    Avoids spam via vehicle.last_reminder_sent (re-send only after 14 days).
    """
    today = date.today()
    min_reminder_gap = 14  # don't send again within 14 days

    # Vehicles due: last_serviced + interval <= today, and last_reminder_sent allows re-send
    vehicles = Vehicle.objects.select_related("customer").filter(
        last_serviced__isnull=False,
        customer__receive_service_reminders=True,
    ).exclude(customer__phone_number="")

    sent_count = 0
    for v in vehicles:
        interval = v.service_interval_days or 180
        due_date = v.last_serviced + timedelta(days=interval)
        if due_date > today:
            continue
        if v.last_reminder_sent and (today - v.last_reminder_sent).days < min_reminder_gap:
            continue

        c = v.customer
        msg = (
            f"Hi {c.first_name}, your vehicle {v.make} {v.model} ({v.license_plate}) "
            f"is due for servicing. Last serviced {v.last_serviced}. Please book an appointment soon."
        )
        send_sms(c.phone_number, msg, context="service_reminder")

        email = (c.email or "").strip()
        if email:
            send_email(
                email,
                f"Service reminder: {v.make} {v.model}",
                f"Hi {c.first_name},\n\n{msg}\n\nThank you.",
                context="service_reminder",
            )

        v.last_reminder_sent = today
        v.save(update_fields=["last_reminder_sent"])
        sent_count += 1

    return {"sent": sent_count}

@shared_task
def notify_mechanic_assignment(service_request_id):
    """
    Notify the mechanic via SMS and email when a service request is assigned to them.
    """
    from .models import ServiceRequest
    from core.messaging import send_email, send_sms

    service_request = ServiceRequest.objects.select_related(
        "assigned_mechanic", "vehicle", "customer"
    ).get(id=service_request_id)
    mechanic = service_request.assigned_mechanic
    if not mechanic:
        return
    vehicle = service_request.vehicle
    customer = service_request.customer
    vehicle_info = (
        f"{vehicle.make} {vehicle.model} ({vehicle.license_plate})"
        if vehicle
        else "Parts sale (no vehicle)"
    )
    message = (
        f"Hello {mechanic.name}, you have been assigned a new service request.\n"
        f"Customer: {customer.first_name} {customer.last_name}\n"
        f"Vehicle: {vehicle_info}\n"
        f"Description: {service_request.description}"
    )
    send_sms(mechanic.phone_number, message, context="mechanic_assignment")


def _do_adjust_inventory(service_request_id):
    """
    Adjusts inventory quantities based on products used in a completed service.
    Deducts from Inventory (product + site) and creates InventoryTransaction OUT records.
    Runs inline; use adjust_inventory task for async.
    """
    from Inventories.models import Inventory, InventoryTransaction, TransactionType

    service_request = ServiceRequest.objects.select_related("site").get(id=service_request_id)
    site = service_request.site
    product_usages = ProductUsage.objects.select_related("product").filter(service_request=service_request)

    for usage in product_usages:
        inv = (
            Inventory.objects.select_for_update()
            .filter(product=usage.product, site=site)
            .first()
        )
        if not inv:
            raise ValueError(f"No inventory record for {usage.product.name} at site {site.name}. Add stock first.")
        if inv.quantity_on_hand < usage.quantity_used:
            raise ValueError(
                f"Insufficient inventory for {usage.product.name} "
                f"(have {inv.quantity_on_hand}, need {usage.quantity_used})."
            )
        inv.quantity_on_hand -= usage.quantity_used
        inv.save(update_fields=["quantity_on_hand"])
        InventoryTransaction.objects.create(
            inventory=inv,
            transaction_type=TransactionType.OUT,
            quantity=-usage.quantity_used,
            reference_type="product_usage",
            reference_id=usage.id,
            notes=f"Service request #{service_request_id}",
        )


@shared_task
def adjust_inventory(service_request_id):
    """Celery task wrapper for _do_adjust_inventory."""
    _do_adjust_inventory(service_request_id)


def _do_generate_invoice(service_request_id, promotion_id=None, discount_amount=None):
    """
    Creates an invoice for the completed service request from product usage.
    Optionally applies a promotion or manual discount.
    Runs inline; use generate_invoice task for async.
    """
    from Promotions.models import Promotion

    service_request = ServiceRequest.objects.get(id=service_request_id)
    parts_total = Decimal("0")

    product_usages = ProductUsage.objects.select_related("product").filter(service_request=service_request)
    for usage in product_usages:
        parts_total += usage.product.unit_price * usage.quantity_used

    labor_cost = service_request.labor_cost or Decimal("0")
    subtotal = parts_total + labor_cost

    discount = Decimal("0")
    promotion = None
    if promotion_id:
        try:
            promotion = Promotion.objects.get(id=promotion_id)
            discount = promotion.compute_discount(subtotal)
        except Promotion.DoesNotExist:
            pass
    if discount_amount is not None:
        discount = min(Decimal(str(discount_amount)), subtotal)
    total_cost = max(Decimal("0"), subtotal - discount)

    invoice = Invoice.objects.create(
        service_request=service_request,
        subtotal=subtotal,
        discount_amount=discount,
        total_cost=total_cost,
        promotion=promotion,
    )
    return invoice


@shared_task
def generate_invoice(service_request_id):
    """Celery task wrapper for _do_generate_invoice."""
    return _do_generate_invoice(service_request_id)


def _notify_customer_job_complete(service_request_id):
    """
    Notify the customer that their job is complete - vehicle ready for pickup, or parts ready.
    """
    from core.messaging import send_email, send_sms

    sr = ServiceRequest.objects.select_related("customer", "vehicle").get(
        id=service_request_id
    )
    c = sr.customer
    v = sr.vehicle
    if v:
        msg = (
            f"Hi {c.first_name}, your vehicle {v.make} {v.model} ({v.license_plate}) "
            f"is ready for pickup. Thank you."
        )
        subject = f"Your vehicle is ready - {v.make} {v.model}"
        body = (
            f"Hi {c.first_name},\n\n"
            f"Your vehicle {v.make} {v.model} ({v.license_plate}) is ready for pickup.\n\nThank you."
        )
    else:
        msg = f"Hi {c.first_name}, your parts order is ready for pickup. Thank you."
        subject = "Your parts order is ready"
        body = f"Hi {c.first_name},\n\nYour parts order is ready for pickup.\n\nThank you."
    send_sms(c.phone_number, msg, context="job_complete")
    email = (c.email or "").strip()
    if email:
        send_email(email, subject, body, context="job_complete")


def complete_service(service_request_id, promotion_id=None, discount_amount=None):
    """
    Completes the service request, adjusts inventory, creates the invoice,
    notifies the customer (invoice + car ready). Mechanic-assignment
    notifications are handled by signal when a mechanic is assigned.
    Runs synchronously in the request; use a transaction when calling.
    Notification failures are logged but do not roll back completion.
    Optional: promotion_id (apply promotion) or discount_amount (manual discount).
    """
    import logging

    from Invoices.tasks import notify_customer_of_invoice

    logger = logging.getLogger(__name__)
    service_request = ServiceRequest.objects.select_related("vehicle").get(id=service_request_id)
    if service_request.status == "Completed":
        return
    service_request.status = "Completed"
    service_request.save(update_fields=["status"])

    # Update vehicle last_serviced so reminders work (only when vehicle exists)
    from django.utils import timezone
    vehicle = service_request.vehicle
    if vehicle:
        vehicle.last_serviced = timezone.now().date()
        vehicle.save(update_fields=["last_serviced"])
    _do_adjust_inventory(service_request_id)
    invoice = _do_generate_invoice(service_request_id, promotion_id=promotion_id, discount_amount=discount_amount)
    try:
        notify_customer_of_invoice.delay(invoice.id)
    except Exception as e:
        logger.exception("Failed to queue invoice notification: %s", e)
    try:
        _notify_customer_job_complete(service_request_id)
    except Exception as e:
        logger.exception("Failed to send job-complete notification: %s", e)

@shared_task
def test_task():
    print("Test task executed successfully.")
    return "Task completed"
