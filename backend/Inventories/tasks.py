"""
Celery tasks for inventory: stock alerts (email when items fall below reorder level).
"""
from collections import defaultdict

from celery import shared_task
from django.db.models import F, Q

from core.messaging import send_email
from .models import Inventory


@shared_task
def check_low_stock_and_alert():
    """
    Find items at or below reorder level and send email to staff.
    Run daily via Celery Beat.
    """
    qs = Inventory.objects.filter(
        reorder_level__gt=0,
        quantity_on_hand__lte=F("reorder_level"),
    ).select_related("product", "site").order_by("site", "product__name")

    if not qs.exists():
        return {"sent": False, "reason": "no_alerts"}

    # Group by site for per-site emails
    by_site = defaultdict(list)
    for inv in qs:
        by_site[inv.site].append(inv)

    from django.contrib.auth import get_user_model
    User = get_user_model()

    sent_count = 0
    for site, items in by_site.items():
        # Get staff with this site (or superusers) who have email
        recipients = list(
            User.objects.filter(
                is_active=True
            ).filter(
                Q(site=site) | Q(is_superuser=True)
            ).filter(
                email__isnull=False
            ).exclude(
                email=""
            ).values_list("email", flat=True)
        )
        # Avoid duplicates (superuser might also have site)
        recipients = list(dict.fromkeys(recipients))

        if not recipients:
            continue

        lines = [
            f"- {inv.product.name} @ {site.name}: {inv.quantity_on_hand} on hand (reorder at {inv.reorder_level}, suggest {inv.reorder_quantity})"
            for inv in items
        ]
        body = (
            f"Low stock alert for {site.name}\n\n"
            "The following items are at or below their reorder level:\n\n"
            + "\n".join(lines)
            + "\n\nPlease restock as needed."
        )
        for email in recipients:
            send_email(
                email,
                f"[Workshop] Low stock alert - {site.name}",
                body,
                context="stock_alert",
            )
            sent_count += 1

    return {"sent": True, "count": sent_count, "items": qs.count()}
