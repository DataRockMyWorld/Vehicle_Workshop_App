from celery import shared_task

from core.messaging import send_email, send_sms


@shared_task
def notify_welcome_customer(customer_id):
    """
    Send a welcome/thank-you message to a newly registered customer.
    SMS and email (if email provided).
    """
    from .models import Customer

    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return

    biz_name = "Feeling Autopart"
    from django.conf import settings
    cfg = getattr(settings, "FEELING_AUTOPART", {}) or {}
    biz_name = cfg.get("BUSINESS_NAME", biz_name)

    first = (customer.first_name or "").strip() or "there"
    sms_msg = (
        f"Hi {first}, thank you for choosing {biz_name}! "
        f"We're here to keep your vehicle in great shape. Welcome!"
    )
    if customer.phone_number:
        send_sms(customer.phone_number, sms_msg, context="customer_welcome")

    email = (customer.email or "").strip()
    if email:
        subject = f"Welcome to {biz_name}"
        body = (
            f"Hi {first},\n\n"
            f"Thank you for choosing {biz_name}! "
            f"We're committed to keeping your vehicle in great shape.\n\n"
            f"Welcome, and we look forward to serving you.\n\n"
            f"Best regards,\n{biz_name}"
        )
        send_email(email, subject, body, context="customer_welcome")
