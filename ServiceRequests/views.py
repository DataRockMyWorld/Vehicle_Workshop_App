from django.db import transaction
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404

from accounts.permissions import filter_queryset_by_site, IsReadOnlyForHQ
from .models import ServiceRequest, ProductUsage, ServiceCategory
from .serializers import ServiceRequestSerializer, ProductUsageSerializer


class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]
    queryset = ServiceRequest.objects.select_related("customer", "vehicle", "site", "assigned_mechanic", "service_type", "service_type__category").all()

    def get_queryset(self):
        qs = filter_queryset_by_site(super().get_queryset(), self.request.user)
        customer_id = self.request.query_params.get("customer_id")
        vehicle_id = self.request.query_params.get("vehicle_id")
        mechanic_id = self.request.query_params.get("mechanic_id")
        parts_only = self.request.query_params.get("parts_only", "").lower() in ("1", "true", "yes")
        if parts_only:
            qs = qs.filter(vehicle__isnull=True)
        if customer_id:
            try:
                qs = qs.filter(customer_id=int(customer_id))
            except (ValueError, TypeError):
                pass
        if vehicle_id and not parts_only:
            try:
                qs = qs.filter(vehicle_id=int(vehicle_id))
            except (ValueError, TypeError):
                pass
        if mechanic_id:
            try:
                qs = qs.filter(assigned_mechanic_id=int(mechanic_id))
            except (ValueError, TypeError):
                pass
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if site and serializer.validated_data.get("site") != site:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only create service requests for your site.")
        serializer.save()


class ServiceRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceRequestSerializer
    queryset = ServiceRequest.objects.select_related("customer", "vehicle", "site", "assigned_mechanic", "service_type", "service_type__category").all()
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return filter_queryset_by_site(super().get_queryset(), self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status == "Completed":
            raise ValidationError("Cannot edit a completed service request.")
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if site:
                new_site = serializer.validated_data.get("site")
                if new_site and new_site.id != site.id:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("You cannot move a service request to another site.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status == "Completed":
            raise ValidationError("Cannot delete a completed service request.")
        instance.delete()


class CompleteServiceRequestView(APIView):
    """POST to complete a service request: update status, adjust inventory, create invoice."""
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def post(self, request, pk):
        base = ServiceRequest.objects.select_related(
            "customer", "vehicle", "site", "assigned_mechanic", "service_type", "service_type__category"
        ).all()
        sr = get_object_or_404(filter_queryset_by_site(base, request.user), pk=pk)
        if sr.status == 'Completed':
            return Response({'detail': 'Already completed.'}, status=400)
        body = request.data or {}
        promotion_id = body.get('promotion_id')
        discount_amount = body.get('discount_amount')
        labor_cost = body.get('labor_cost')
        if labor_cost is not None:
            from decimal import Decimal
            try:
                labor_cost = Decimal(str(labor_cost))
                if labor_cost < 0:
                    labor_cost = Decimal("0")
            except (TypeError, ValueError):
                labor_cost = None
            if labor_cost is not None:
                sr.labor_cost = labor_cost
                sr.save(update_fields=["labor_cost"])
        from .tasks import complete_service
        try:
            with transaction.atomic():
                complete_service(sr.id, promotion_id=promotion_id, discount_amount=discount_amount)
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        sr.refresh_from_db()
        return Response(ServiceRequestSerializer(sr).data)


class ProductUsageCreateView(generics.CreateAPIView):
    """
    Allows adding a product usage entry to a specific service request.
    """
    queryset = ProductUsage.objects.select_related("service_request", "product").all()
    serializer_class = ProductUsageSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def perform_create(self, serializer):
        service_request = serializer.validated_data["service_request"]
        if service_request.status == "Completed":
            raise ValidationError("Cannot add products to a completed service request.")
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if site and service_request.site_id != site.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only add parts to service requests at your site.")
        serializer.save()


class ProductUsageListView(generics.ListAPIView):
    """
    Retrieves all product usage entries for a specific service request.
    """
    serializer_class = ProductUsageSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        sid = self.kwargs["service_request_id"]
        qs = ProductUsage.objects.filter(service_request_id=sid).select_related(
            "service_request", "product"
        )
        user = self.request.user
        if user.is_superuser or getattr(user, "site", None) is None:
            return qs
        return qs.filter(service_request__site_id=user.site_id)


def _product_usage_queryset(user):
    qs = ProductUsage.objects.select_related("service_request", "product")
    if user.is_superuser or getattr(user, "site", None) is None:
        return qs
    return qs.filter(service_request__site_id=user.site_id)


class ProductUsageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a product usage entry.
    Edit/delete only allowed when service request is not Completed.
    """
    serializer_class = ProductUsageSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return _product_usage_queryset(self.request.user)

    def perform_update(self, serializer):
        sr = serializer.instance.service_request
        if sr.status == "Completed":
            raise ValidationError("Cannot edit parts on a completed service request.")
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if site and sr.site_id != site.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only edit parts on service requests at your site.")
        serializer.save()

    def perform_destroy(self, instance):
        sr = instance.service_request
        if sr.status == "Completed":
            raise ValidationError("Cannot remove parts from a completed service request.")
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if site and sr.site_id != site.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only remove parts from service requests at your site.")
        instance.delete()


class ServiceCategoriesView(APIView):
    """GET /api/v1/service-categories/ — categories with nested service types."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = ServiceCategory.objects.prefetch_related("service_types").order_by("order", "name")
        data = [
            {
                "id": c.id,
                "name": c.name,
                "service_types": [{"id": t.id, "name": t.name} for t in c.service_types.all()],
            }
            for c in categories
        ]
        return Response(data)
