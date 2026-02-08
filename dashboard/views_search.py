"""Global search across service requests, customers, vehicles. Site-scoped for site users."""
from django.db.models import Q

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import user_site_id
from Customers.models import Customer
from ServiceRequests.models import ServiceRequest
from Vehicles.models import Vehicle


class SearchView(APIView):
    """GET /api/v1/search/?q=... — search service requests, customers, vehicles."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"service_requests": [], "customers": [], "vehicles": []})

        sid = user_site_id(request.user)
        limit = min(20, max(5, int(request.query_params.get("limit", 10))))

        base_q = (
            Q(description__icontains=q)
            | Q(customer__first_name__icontains=q)
            | Q(customer__last_name__icontains=q)
            | Q(vehicle__license_plate__icontains=q)
            | Q(vehicle__make__icontains=q)
            | Q(vehicle__model__icontains=q)
        )
        try:
            base_q |= Q(id=int(q))
        except (ValueError, TypeError):
            pass
        sr_qs = (
            ServiceRequest.objects.select_related("customer", "vehicle", "site")
            .filter(base_q)
            .distinct()
        )
        if sid is not None:
            sr_qs = sr_qs.filter(site_id=sid)
        sr_qs = sr_qs[:limit]
        service_requests = [
            {
                "id": sr.id,
                "type": "service_request",
                "title": f"#{sr.id} - {sr.vehicle}",
                "subtitle": f"{sr.customer.first_name} {sr.customer.last_name} · {sr.site.name}",
                "status": sr.status,
                "url": f"/service-requests/{sr.id}",
            }
            for sr in sr_qs
        ]

        # Customers
        cust_qs = Customer.objects.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone_number__icontains=q)
        )[:limit]
        customers = [
            {
                "id": c.id,
                "type": "customer",
                "title": f"{c.first_name} {c.last_name}",
                "subtitle": c.email or c.phone_number or "",
                "url": "/customers",
            }
            for c in cust_qs
        ]

        # Vehicles
        vehicle_qs = Vehicle.objects.select_related("customer", "site").filter(
            Q(license_plate__icontains=q)
            | Q(make__icontains=q)
            | Q(model__icontains=q)
        )
        if sid is not None:
            vehicle_qs = vehicle_qs.filter(site_id=sid)
        vehicle_qs = vehicle_qs[:limit]
        vehicles = [
            {
                "id": v.id,
                "type": "vehicle",
                "title": f"{v.make} {v.model} ({v.license_plate})",
                "subtitle": f"{v.customer.first_name} {v.customer.last_name}",
                "url": "/vehicles",
            }
            for v in vehicle_qs
        ]

        return Response({
            "service_requests": service_requests,
            "customers": customers,
            "vehicles": vehicles,
        })
