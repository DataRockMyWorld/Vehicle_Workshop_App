"""
CEO/MD dashboard API. Returns aggregated metrics across all sites.
Only accessible to users with can_see_all_sites (superuser or site=null).
"""
import csv
import io
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.http import HttpResponse
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import user_site_id
from dashboard.permissions import CanSeeAllSites
from Invoices.models import Invoice
from ServiceRequests.models import ProductUsage
from Inventories.models import Inventory, InventoryTransaction
from Mechanics.models import Mechanic
from ServiceRequests.models import ServiceRequest
from Site.models import Site
from Customers.models import Customer
from Vehicles.models import Vehicle


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


class CsvExportView(APIView):
    """
    Export data as CSV. ?resource=service_requests|invoices|inventory
    CEO: all data. Site user: their site only.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.permissions import user_site_id

        resource = request.query_params.get("resource", "service_requests")
        sid = user_site_id(request.user)
        output = io.StringIO()
        w = csv.writer(output)

        if resource == "service_requests":
            qs = ServiceRequest.objects.filter(created_at__gte=timezone.now() - timedelta(days=365))
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
            qs = Invoice.objects.filter(created_at__gte=timezone.now() - timedelta(days=365))
            if sid is not None:
                qs = qs.filter(service_request__site_id=sid)
            qs = qs.select_related("service_request", "service_request__customer").order_by("-created_at")
            w.writerow(["id", "service_request_id", "customer", "subtotal", "discount", "total", "paid", "payment_method", "created_at"])
            for inv in qs:
                w.writerow([
                    inv.id, inv.service_request_id, str(inv.service_request.customer),
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
