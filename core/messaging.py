"""
SMS-style messaging: log to console in development, send via Twilio in production.

Set USE_TWILIO_SMS=True and provide Twilio credentials to send real SMS.
Otherwise messages are printed to the console so you can confirm flows work.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _use_twilio():
    """Use Twilio only when explicitly enabled and credentials are present."""
    if not getattr(settings, "USE_TWILIO_SMS", False):
        return False
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "") or ""
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "") or ""
    from_ = getattr(settings, "TWILIO_PHONE_NUMBER", "") or ""
    return bool(sid and token and from_)


def _format_to(to):
    """Normalize phone for display/logging. Use E.164 format (e.g. +1234567890) in DB."""
    s = str(to).strip()
    return s or "+???"


def send_sms(to, body, context="sms"):
    """
    Send an SMS: log to console in dev, or send via Twilio when enabled.

    - to: phone number (str or int)
    - body: message text
    - context: short label for logging (e.g. 'mechanic_assignment', 'invoice', 'job_complete')
    """
    to_display = _format_to(to)
    if _use_twilio():
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=to_display,
            )
            logger.info("[SMS] context=%s to=%s sent via Twilio", context, to_display)
        except Exception as e:
            logger.exception("[SMS] context=%s to=%s Twilio send failed: %s", context, to_display, e)
            raise
    else:
        # Development: log to console so you can confirm the flow works
        sep = "\n"
        preview = (body.strip()[:200] + "…") if len(body.strip()) > 200 else body.strip()
        msg = f"[SMS LOG] context={context} to={to_display}{sep}{preview}"
        print(msg)
        logger.info("[SMS] context=%s to=%s (console only)", context, to_display)


def send_email(to_email, subject, body, context="email"):
    """
    Send an email: log to terminal for now (like SMS in dev).
    Future: wire to Django's email backend or a provider.
    - to_email: recipient address
    - subject: email subject
    - body: plain-text body
    - context: short label for logging (e.g. 'invoice', 'job_complete')
    """
    to_display = str(to_email or "").strip() or "???"
    sep = "\n"
    preview = (body.strip()[:300] + "…") if len(body.strip()) > 300 else body.strip()
    msg = f"[EMAIL LOG] context={context} to={to_display} subject={subject!r}{sep}{preview}"
    print(msg)
    logger.info("[EMAIL] context=%s to=%s (terminal only)", context, to_display)
