"""
CEO/MD dashboard API. Returns aggregated metrics across all sites.
Only accessible to users with can_see_all_sites (superuser or site=null).
"""
import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.cache import cache
from django.http import HttpResponse
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import user_site_id
from dashboard.permissions import CanSeeAllSites
from Invoices.models import Invoice, PaymentMethod
from ServiceRequests.models import ProductUsage
from Inventories.models import Inventory, InventoryTransaction
from Mechanics.models import Mechanic
from ServiceRequests.models import ServiceRequest
from Site.models import Site
from Customers.models import Customer
from Vehicles.models import Vehicle


# --- Date range parsing for reports ---
MAX_REPORT_DAYS = 730  # 2 years


def _parse_date(s: str):
    """Parse YYYY-MM-DD to date. Returns None if invalid."""
    if not s or not isinstance(s, str):
        return None
    try:
        return datetime.strptime(s.strip()[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _get_report_date_range(request):
    """
    Resolve date_from, date_to from request.
    Supports: date_from + date_to (explicit) OR period (rolling days).
    Returns (date_from, date_to) as timezone-aware datetimes (start/end of day in server TZ).
    Raises ValueError on invalid params.
    """
    params = request.query_params
    date_from_str = params.get("date_from")
    date_to_str = params.get("date_to")
    period_str = params.get("period")

    if date_from_str and date_to_str:
        d_from = _parse_date(date_from_str)
        d_to = _parse_date(date_to_str)
        if not d_from or not d_to:
            raise ValueError("date_from and date_to must be YYYY-MM-DD")
        if d_from > d_to:
            raise ValueError("date_from must be on or before date_to")
        delta = (d_to - d_from).days
        if delta > MAX_REPORT_DAYS:
            raise ValueError(f"Date range must not exceed {MAX_REPORT_DAYS} days")
    elif period_str:
        try:
            period = int(period_str)
        except (ValueError, TypeError):
            raise ValueError("period must be an integer")
        if period < 1 or period > MAX_REPORT_DAYS:
            raise ValueError(f"period must be between 1 and {MAX_REPORT_DAYS}")
        end = timezone.now()
        start = end - timedelta(days=period)
        # Use date boundaries for consistency
        local_end = timezone.localtime(end)
        local_start = timezone.localtime(start)
        d_from = local_start.date()
        d_to = local_end.date()
    else:
        # Default: last 30 days
        end = timezone.now()
        start = end - timedelta(days=30)
        local_end = timezone.localtime(end)
        local_start = timezone.localtime(start)
        d_from = local_start.date()
        d_to = local_end.date()

    # Start of day and end of day in server timezone
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(d_from, datetime.min.time()), tz)
    end_dt = timezone.make_aware(datetime.combine(d_to, datetime.max.time().replace(microsecond=0)), tz)
    return start_dt, end_dt


class SiteDashboardView(APIView):
    """
    Sales metrics for site-scoped dashboard.
    Returns revenue and sales counts for today and this week, filtered by user's site.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sid = user_site_id(request.user)
        now = timezone.now()
        # Rolling windows: last 7 days and previous 7 days (avoids calendar week boundary issues)
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        # Today: start of day in configured timezone
        local_now = timezone.localtime(now)
        today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)

        inv_qs = Invoice.objects.select_related("service_request")
        if sid is not None:
            inv_qs = inv_qs.filter(service_request__site_id=sid)

        today_inv = inv_qs.filter(created_at__gte=today_start)
        week_inv = inv_qs.filter(created_at__gte=week_ago)
        prev_week_inv = inv_qs.filter(created_at__gte=two_weeks_ago, created_at__lt=week_ago)

        revenue_today = today_inv.aggregate(t=Sum("total_cost"))["t"] or Decimal("0")
        revenue_week = week_inv.aggregate(t=Sum("total_cost"))["t"] or Decimal("0")
        revenue_prev_week = prev_week_inv.aggregate(t=Sum("total_cost"))["t"] or Decimal("0")
        sales_today = today_inv.count()
        sales_week = week_inv.count()
        sales_prev_week = prev_week_inv.count()

        paid_today = today_inv.filter(paid=True).aggregate(t=Sum("total_cost"))["t"] or Decimal("0")
        unpaid_today = today_inv.filter(paid=False).aggregate(t=Sum("total_cost"))["t"] or Decimal("0")

        data = {
            "revenue_today": str(round(revenue_today, 2)),
            "revenue_week": str(round(revenue_week, 2)),
            "revenue_prev_week": str(round(revenue_prev_week, 2)),
            "sales_count_today": sales_today,
            "sales_count_week": sales_week,
            "sales_count_prev_week": sales_prev_week,
            "paid_today": str(round(paid_today, 2)),
            "unpaid_today": str(round(unpaid_today, 2)),
        }
        if request.query_params.get("debug"):
            data["_debug"] = {
                "user_site_id": sid,
                "week_ago": str(week_ago),
                "today_start": str(today_start),
                "total_invoices_in_query": inv_qs.count(),
            }
        resp = Response(data)
        resp["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return resp


class DashboardView(APIView):
    """Aggregated metrics for CEO/MD overview. Requires HQ access (superuser or site=null)."""

    permission_classes = [IsAuthenticated, CanSeeAllSites]

    def get(self, request):
        period_days = min(365, max(7, int(request.query_params.get("period", 30))))
        site_id = request.query_params.get("site_id")
        try:
            site_id = int(site_id) if site_id else None
        except (ValueError, TypeError):
            site_id = None
        cache_key = f"dashboard:{request.user.id}:{period_days}:{site_id or 'all'}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        since = timezone.now() - timedelta(days=period_days)

        # Summary counts (optionally filtered by site)
        sites_qs = Site.objects.all()
        sr_qs = ServiceRequest.objects.filter(created_at__gte=since)
        inv_qs = Invoice.objects.filter(created_at__gte=since)
        if site_id:
            sr_qs = sr_qs.filter(site_id=site_id)
            inv_qs = inv_qs.filter(service_request__site_id=site_id)

        status_counts = dict(
            sr_qs.values("status").annotate(cnt=Count("id")).values_list("status", "cnt")
        )
        total_revenue = inv_qs.aggregate(total=Sum("total_cost"))["total"] or Decimal("0")

        low_stock_qs = Inventory.objects.filter(
            reorder_level__gt=0, quantity_on_hand__lte=F("reorder_level")
        )
        if site_id:
            low_stock_qs = low_stock_qs.filter(site_id=site_id)

        summary = {
            "total_sites": sites_qs.count(),
            "total_service_requests": sr_qs.count(),
            "pending": status_counts.get("Pending", 0),
            "in_progress": status_counts.get("In Progress", 0),
            "completed": status_counts.get("Completed", 0),
            "total_revenue": str(round(total_revenue, 2)),
            "total_customers": Customer.objects.count() if not site_id else Customer.objects.filter(servicerequest__site_id=site_id).distinct().count(),
            "total_mechanics": Mechanic.objects.count() if not site_id else Mechanic.objects.filter(site_id=site_id).count(),
            "total_vehicles": Vehicle.objects.count() if not site_id else Vehicle.objects.filter(servicerequest__site_id=site_id).distinct().count(),
            "low_stock_count": low_stock_qs.count(),
        }

        # Per-site breakdown (all sites, or single selected site)
        by_site = []
        sites_to_show = sites_qs.filter(pk=site_id) if site_id else sites_qs
        for site in sites_to_show:
            site_sr = ServiceRequest.objects.filter(site=site, created_at__gte=since)
            site_invoices = Invoice.objects.filter(
                service_request__site=site, created_at__gte=since
            )
            site_revenue = site_invoices.aggregate(t=Sum("total_cost"))["t"] or Decimal("0")
            by_site.append(
                {
                    "id": site.id,
                    "name": site.name,
                    "location": site.location,
                    "service_requests": site_sr.count(),
                    "completed": site_sr.filter(status="Completed").count(),
                    "pending": site_sr.filter(status="Pending").count(),
                    "in_progress": site_sr.filter(status="In Progress").count(),
                    "revenue": str(round(site_revenue, 2)),
                    "mechanics_count": Mechanic.objects.filter(site=site).count(),
                }
            )

        # Service requests trend (by day)
        sr_trend = (
            sr_qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        requests_trend = [{"date": str(t["date"]), "count": t["count"]} for t in sr_trend]

        # Revenue trend (by day, from invoices)
        inv_trend_qs = inv_qs.annotate(date=TruncDate("created_at")).values("date").annotate(total=Sum("total_cost")).order_by("date")
        revenue_trend = [
            {"date": str(t["date"]), "total": str(round(t["total"] or 0, 2))}
            for t in inv_trend_qs
        ]

        # Low stock items
        low_stock = list(
            low_stock_qs.select_related("product", "site").values(
                "id", "product__name", "site__name", "quantity_on_hand", "reorder_level"
            )
        )
        low_stock_items = [
            {
                "id": x["id"],
                "product_name": x["product__name"],
                "site_name": x["site__name"],
                "quantity_on_hand": x["quantity_on_hand"],
                "reorder_level": x["reorder_level"],
            }
            for x in low_stock
        ]

        sites_list = [{"id": s.id, "name": s.name} for s in sites_qs]
        payload = {
            "summary": summary,
            "by_site": by_site,
            "sites": sites_list,
            "requests_trend": requests_trend,
            "revenue_trend": revenue_trend,
            "low_stock_items": low_stock_items,
            "period_days": period_days,
        }
        cache.set(cache_key, payload, timeout=300)  # 5 min
        return Response(payload)


def _build_activities(limit=5, site_id=None):
    """Build unified activity feed from ServiceRequests, Invoices, InventoryTransactions.
    Optional site_id: filter to that site's economic activity."""
    activities = []
    since = timezone.now() - timedelta(hours=24)  # Last 24h

    sr_base = ServiceRequest.objects.filter(created_at__gte=since)
    if site_id:
        sr_base = sr_base.filter(site_id=site_id)
    for sr in sr_base.select_related("site", "vehicle").order_by("-created_at")[:limit]:
        activities.append(
            {
                "type": "service_request_created",
                "site_id": sr.site_id,
                "site_name": sr.site.name,
                "description": f"New service request #{sr.id} ({sr.vehicle})",
                "created_at": sr.created_at.isoformat(),
                "link": {"type": "service_request", "id": sr.id},
            }
        )

    # Invoices = jobs completed
    inv_base = Invoice.objects.filter(created_at__gte=since).select_related(
        "service_request", "service_request__site", "service_request__vehicle"
    )
    if site_id:
        inv_base = inv_base.filter(service_request__site_id=site_id)
    for inv in inv_base.order_by("-created_at")[:limit]:
        sr = inv.service_request
        activities.append(
            {
                "type": "job_completed",
                "site_id": sr.site_id,
                "site_name": sr.site.name,
                "description": f"Job completed #{sr.id} — Invoice GH₵{round(inv.total_cost, 2)}",
                "created_at": inv.created_at.isoformat(),
                "link": {"type": "service_request", "id": sr.id},
            }
        )

    # Inventory transactions
    tx_base = InventoryTransaction.objects.filter(created_at__gte=since).select_related(
        "inventory", "inventory__site", "inventory__product"
    )
    if site_id:
        tx_base = tx_base.filter(inventory__site_id=site_id)
    for tx in tx_base.order_by("-created_at")[:limit]:
        inv = tx.inventory
        action = tx.transaction_type.replace("_", " ").title()
        activities.append(
            {
                "type": "inventory",
                "site_id": inv.site_id,
                "site_name": inv.site.name,
                "description": f"{action}: {inv.product.name} ({tx.quantity:+d})",
                "created_at": tx.created_at.isoformat(),
                "link": {"type": "inventory", "id": inv.id},
            }
        )

    # Sort by created_at descending and take top N
    activities.sort(key=lambda a: a["created_at"], reverse=True)
    return activities[:limit]


class DashboardActivitiesView(APIView):
    """Live activity feed for executive dashboard. Lightweight, intended for polling.
    Optional ?site_id=N to filter to a specific site's economic activity."""

    permission_classes = [IsAuthenticated, CanSeeAllSites]

    def get(self, request):
        limit = min(50, max(1, int(request.query_params.get("limit", 5))))
        site_id = request.query_params.get("site_id")
        try:
            site_id = int(site_id) if site_id else None
        except (ValueError, TypeError):
            site_id = None
        cache_key = f"dashboard:activities:{limit}:{site_id or 'all'}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        activities = _build_activities(limit=limit, site_id=site_id)
        cache.set(cache_key, {"activities": activities}, timeout=30)  # 30s for live feel
        return Response({"activities": activities})


def _get_top_products(limit=10, since=None):
    """Top products by quantity used in completed service requests."""
    qs = ProductUsage.objects.filter(service_request__status="Completed")
    if since:
        qs = qs.filter(service_request__created_at__gte=since)
    top = (
        qs.values("product__id", "product__name")
        .annotate(total_qty=Sum("quantity_used"))
        .order_by("-total_qty")[:limit]
    )
    return [{"product_id": x["product__id"], "product_name": x["product__name"], "quantity_used": x["total_qty"]} for x in top]


class ReportsView(APIView):
    """
    Extended reports: revenue by site, service volume, top products.
    CEO/HQ only. Use ?period=30 for days.
    """

    permission_classes = [IsAuthenticated, CanSeeAllSites]

    def get(self, request):
        period_days = min(365, max(7, int(request.query_params.get("period", 30))))
        since = timezone.now() - timedelta(days=period_days)

        by_site = []
        for site in Site.objects.all():
            site_inv = Invoice.objects.filter(service_request__site=site, created_at__gte=since)
            rev = site_inv.aggregate(t=Sum("total_cost"))["t"] or Decimal("0")
            cnt = ServiceRequest.objects.filter(site=site, created_at__gte=since, status="Completed").count()
            by_site.append({"site_id": site.id, "site_name": site.name, "revenue": str(round(rev, 2)), "completed": cnt})

        top_products = _get_top_products(limit=15, since=since)
        return Response({
            "by_site": by_site,
            "top_products": top_products,
            "period_days": period_days,
        })


class SalesReportView(APIView):
    """
    Audit-ready sales report. Standard format for accounting and audit purposes.

    Query params:
      date_from, date_to: YYYY-MM-DD (explicit range, preferred for audit)
      period: integer days (rolling from today, fallback)
      site_id: optional, CEO only - filter to specific site
      group_by: day | week | month - granularity for trend (default: day)

    Returns: summary, by_site, by_date, by_payment_method, transactions (traceable).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            start_dt, end_dt = _get_report_date_range(request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        sid = user_site_id(request.user)
        site_filter = request.query_params.get("site_id")
        if sid is not None:
            filter_site_id = sid
        else:
            try:
                filter_site_id = int(site_filter) if site_filter else None
            except (ValueError, TypeError):
                filter_site_id = None

        group_by = request.query_params.get("group_by", "day").lower()
        if group_by not in ("day", "week", "month"):
            group_by = "day"

        inv_qs = Invoice.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        ).select_related("service_request", "service_request__site", "service_request__customer")
        if filter_site_id is not None:
            inv_qs = inv_qs.filter(service_request__site_id=filter_site_id)

        # --- Summary ---
        agg = inv_qs.aggregate(
            total_revenue=Sum("total_cost"),
            count=Count("id"),
        )
        paid_agg = inv_qs.filter(paid=True).aggregate(paid_revenue=Sum("total_cost"))
        unpaid_agg = inv_qs.filter(paid=False).aggregate(unpaid_revenue=Sum("total_cost"))

        total_revenue = agg["total_revenue"] or Decimal("0")
        count = agg["count"] or 0
        paid_revenue = paid_agg["paid_revenue"] or Decimal("0")
        unpaid_revenue = unpaid_agg["unpaid_revenue"] or Decimal("0")
        avg_ticket = round(total_revenue / count, 2) if count > 0 else Decimal("0")

        # --- By site ---
        by_site_data = (
            inv_qs.values("service_request__site_id", "service_request__site__name")
            .annotate(
                revenue=Sum("total_cost"),
                sales_count=Count("id"),
            )
            .order_by("service_request__site__name")
        )
        by_site = [
            {
                "site_id": x["service_request__site_id"],
                "site_name": x["service_request__site__name"] or "—",
                "revenue": str(round(x["revenue"] or 0, 2)),
                "sales_count": x["sales_count"],
            }
            for x in by_site_data
        ]

        # --- By date (grouped) ---
        trunc_fn = {"day": TruncDate, "week": TruncWeek, "month": TruncMonth}[group_by]
        by_date_qs = (
            inv_qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(revenue=Sum("total_cost"), sales_count=Count("id"))
            .order_by("period")
        )
        by_date = [
            {"period": str(x["period"]), "revenue": str(round(x["revenue"] or 0, 2)), "sales_count": x["sales_count"]}
            for x in by_date_qs
        ]

        # --- By payment method ---
        pm_qs = (
            inv_qs.filter(paid=True)
            .exclude(Q(payment_method__isnull=True) | Q(payment_method=""))
            .values("payment_method")
            .annotate(revenue=Sum("total_cost"), count=Count("id"))
            .order_by("-revenue")
        )
        payment_labels = dict(PaymentMethod.choices)
        by_payment_method = [
            {
                "payment_method": x["payment_method"],
                "payment_method_label": payment_labels.get(x["payment_method"], x["payment_method"]),
                "revenue": str(round(x["revenue"] or 0, 2)),
                "count": x["count"],
            }
            for x in pm_qs
        ]
        unpaid_count = inv_qs.filter(paid=False).count()
        if unpaid_count > 0 or unpaid_revenue > 0:
            by_payment_method.append({
                "payment_method": "unpaid",
                "payment_method_label": "Unpaid / Pending",
                "revenue": str(round(unpaid_revenue, 2)),
                "count": unpaid_count,
            })

        # --- Transactions (traceable for audit) ---
        transactions = list(
            inv_qs.order_by("created_at").values(
                "id",
                "service_request_id",
                "service_request__site_id",
                "service_request__site__name",
                "subtotal",
                "discount_amount",
                "total_cost",
                "paid",
                "payment_method",
                "created_at",
            )
        )
        transactions_serialized = [
            {
                "invoice_id": t["id"],
                "service_request_id": t["service_request_id"],
                "site_id": t["service_request__site_id"],
                "site_name": t["service_request__site__name"] or "—",
                "subtotal": str(t["subtotal"]),
                "discount_amount": str(t["discount_amount"] or "0"),
                "total_cost": str(t["total_cost"]),
                "paid": t["paid"],
                "payment_method": t["payment_method"] or "",
                "created_at": t["created_at"].isoformat() if t["created_at"] else "",
            }
            for t in transactions
        ]

        payload = {
            "report_metadata": {
                "report_type": "sales_report",
                "generated_at": timezone.now().isoformat(),
                "date_from": start_dt.strftime("%Y-%m-%d"),
                "date_to": end_dt.strftime("%Y-%m-%d"),
                "scope": "all_sites" if filter_site_id is None else f"site_id={filter_site_id}",
                "group_by": group_by,
                "transaction_count": count,
            },
            "summary": {
                "total_revenue": str(round(total_revenue, 2)),
                "total_sales_count": count,
                "paid_revenue": str(round(paid_revenue, 2)),
                "unpaid_revenue": str(round(unpaid_revenue, 2)),
                "average_ticket": str(avg_ticket),
            },
            "by_site": by_site,
            "by_date": by_date,
            "by_payment_method": by_payment_method,
            "transactions": transactions_serialized,
        }
        return Response(payload)


class CsvExportView(APIView):
    """
    Export data as CSV. ?resource=service_requests|invoices|inventory

    Date range (for service_requests and invoices):
      date_from, date_to: YYYY-MM-DD
      period: integer days (rolling, default 365 if no dates)

    CEO: all data. Site user: their site only.
    """

    permission_classes = [IsAuthenticated]

    def _get_export_date_range(self, request):
        """Return (start_dt, end_dt) for export. Defaults to last 365 days if no params."""
        params = request.query_params
        if not any(k in params for k in ("date_from", "date_to", "period")):
            end = timezone.now()
            start = end - timedelta(days=365)
            return start, end
        return _get_report_date_range(request)

    def get(self, request):
        from accounts.permissions import user_site_id

        resource = request.query_params.get("resource", "service_requests")
        sid = user_site_id(request.user)
        try:
            start_dt, end_dt = self._get_export_date_range(request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        output = io.StringIO()
        w = csv.writer(output)

        if resource == "service_requests":
            qs = ServiceRequest.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
            )
            if sid is not None:
                qs = qs.filter(site_id=sid)
            qs = qs.select_related("customer", "vehicle", "site", "assigned_mechanic").order_by("-created_at")
            w.writerow(["id", "customer", "vehicle", "site", "status", "description", "created_at"])
            for sr in qs:
                w.writerow([
                    sr.id, str(sr.customer), str(sr.vehicle), sr.site.name, sr.status,
                    (sr.description or "")[:100], sr.created_at.strftime("%Y-%m-%d %H:%M"),
                ])
        elif resource == "invoices":
            qs = Invoice.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
            )
            if sid is not None:
                qs = qs.filter(service_request__site_id=sid)
            qs = qs.select_related("service_request", "service_request__customer", "service_request__site").order_by("-created_at")
            w.writerow(["id", "service_request_id", "site_id", "customer", "subtotal", "discount", "total", "paid", "payment_method", "created_at"])
            for inv in qs:
                sr = inv.service_request
                w.writerow([
                    inv.id, inv.service_request_id, sr.site_id, str(sr.customer),
                    inv.subtotal, inv.discount_amount, inv.total_cost, inv.paid,
                    inv.payment_method or "",
                    inv.created_at.strftime("%Y-%m-%d %H:%M"),
                ])
        elif resource == "inventory":
            from Inventories.models import Inventory
            qs = Inventory.objects.select_related("product", "site").order_by("site", "product__name")
            if sid is not None:
                qs = qs.filter(site_id=sid)
            w.writerow(["id", "product", "site", "quantity_on_hand", "quantity_reserved", "reorder_level"])
            for inv in qs:
                w.writerow([
                    inv.id, inv.product.name, inv.site.name, inv.quantity_on_hand,
                    inv.quantity_reserved, inv.reorder_level,
                ])
        else:
            return Response({"detail": f"Unknown resource: {resource}"}, status=400)

        resp = HttpResponse(output.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="{resource}.csv"'
        return resp
