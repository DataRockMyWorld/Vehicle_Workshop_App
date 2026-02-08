from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ, filter_queryset_by_site
from rest_framework.exceptions import PermissionDenied

from .models import Inventory
from .serializers import InventorySerializer


class InventoryListCreateView(generics.ListCreateAPIView):
    queryset = Inventory.objects.select_related("product", "site").all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        qs = filter_queryset_by_site(super().get_queryset(), self.request.user)
        site_id = self.request.query_params.get("site_id")
        if site_id:
            try:
                qs = qs.filter(site_id=int(site_id))
            except (ValueError, TypeError):
                pass
        if self.request.query_params.get("low_stock", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(reorder_level__gt=0, quantity_on_hand__lte=models.F("reorder_level"))
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        restricted = serializer.validated_data.get("restricted_edit", True)
        if restricted and not user.is_superuser:
            raise PermissionDenied("Only superusers can create inventory when restricted_edit is set.")
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if site and serializer.validated_data.get("site") != site:
                raise PermissionDenied("You can only create inventory for your site.")
        serializer.save()


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Inventory.objects.select_related("product", "site").all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return filter_queryset_by_site(super().get_queryset(), self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.restricted_edit and not self.request.user.is_superuser:
            raise PermissionDenied("Only superusers can modify this inventory record.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.restricted_edit and not self.request.user.is_superuser:
            raise PermissionDenied("Only superusers can delete this inventory record.")
        instance.delete()


class LowStockAlertsView(APIView):
    """GET /api/v1/inventory/low-stock/ — items at or below reorder level. Site-scoped."""

    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get(self, request):
        qs = Inventory.objects.filter(
            reorder_level__gt=0,
            quantity_on_hand__lte=models.F("reorder_level"),
        ).select_related("product", "site")
        qs = filter_queryset_by_site(qs, request.user)
        items = [
            {
                "id": inv.id,
                "product_id": inv.product_id,
                "product_name": inv.product.name,
                "site_id": inv.site_id,
                "site_name": inv.site.name,
                "quantity_on_hand": inv.quantity_on_hand,
                "reorder_level": inv.reorder_level,
                "reorder_quantity": inv.reorder_quantity,
            }
            for inv in qs
        ]
        return Response({"alerts": items, "count": len(items)})
