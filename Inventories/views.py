from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.db.models import Q
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ, filter_queryset_by_site
from rest_framework.exceptions import PermissionDenied

from .models import Inventory
from .serializers import InventorySerializer, InventoryListSerializer


# Ordering options: query_param_value -> order_by expression(s)
INVENTORY_ORDER_MAP = {
    "product": ["product__name"],
    "-product": ["-product__name"],
    "qty_asc": ["quantity_on_hand"],
    "qty_desc": ["-quantity_on_hand"],
    "available_asc": ["quantity_on_hand"],
    "available_desc": ["-quantity_on_hand"],
    "reorder_asc": ["reorder_level"],
    "reorder_desc": ["-reorder_level"],
    "bin": ["bin_location"],
    "-bin": ["-bin_location"],
    "site_product": ["site__name", "product__name"],
}


class InventoryListCreateView(generics.ListCreateAPIView):
    queryset = Inventory.objects.select_related("product", "site").all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return InventoryListSerializer
        return InventorySerializer

    def get_queryset(self):
        qs = filter_queryset_by_site(super().get_queryset(), self.request.user)

        # Site filter
        site_id = self.request.query_params.get("site_id")
        if site_id:
            try:
                qs = qs.filter(site_id=int(site_id))
            except (ValueError, TypeError):
                pass

        # Search: product name, SKU, FMSI, part number, brand, application
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(product__name__icontains=q)
                | Q(product__sku__icontains=q)
                | Q(product__fmsi_number__icontains=q)
                | Q(product__part_number__icontains=q)
                | Q(product__brand__icontains=q)
                | Q(product__application__icontains=q)
                | Q(product__description__icontains=q)
                | Q(bin_location__icontains=q)
            )

        # Product filters
        category = self.request.query_params.get("category", "").strip()
        if category:
            qs = qs.filter(product__category=category)

        product_type = self.request.query_params.get("product_type", "").strip()
        if product_type:
            qs = qs.filter(product__product_type__icontains=product_type)

        position = self.request.query_params.get("position", "").strip()
        if position:
            qs = qs.filter(product__position__icontains=position)

        brand = self.request.query_params.get("brand", "").strip()
        if brand:
            qs = qs.filter(product__brand__icontains=brand)

        # Bin location filter
        bin_location = self.request.query_params.get("bin_location", "").strip()
        if bin_location:
            qs = qs.filter(bin_location__icontains=bin_location)

        # Stock status: all (default), low_stock, out_of_stock, in_stock
        stock_status = self.request.query_params.get("stock_status", "").strip().lower()
        if stock_status == "low_stock":
            qs = qs.filter(reorder_level__gt=0, quantity_on_hand__lte=models.F("reorder_level"))
        elif stock_status == "out_of_stock":
            qs = qs.filter(quantity_on_hand=0)
        elif stock_status == "in_stock":
            qs = qs.filter(quantity_on_hand__gt=0)
        elif stock_status == "" and self.request.query_params.get("low_stock", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(reorder_level__gt=0, quantity_on_hand__lte=models.F("reorder_level"))

        # Ordering
        order = self.request.query_params.get("ordering", "product").strip()
        if order in INVENTORY_ORDER_MAP:
            qs = qs.order_by(*INVENTORY_ORDER_MAP[order])
        else:
            qs = qs.order_by("product__name")

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


class InventoryFilterOptionsView(APIView):
    """GET /api/v1/inventory/filter-options/ — distinct values for filter dropdowns. Site-scoped."""

    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get(self, request):
        qs = Inventory.objects.select_related("product", "site").all()
        qs = filter_queryset_by_site(qs, request.user)
        site_id = request.query_params.get("site_id")
        if site_id:
            try:
                qs = qs.filter(site_id=int(site_id))
            except (ValueError, TypeError):
                pass
        categories = list(
            qs.values_list("product__category", flat=True).distinct().order_by("product__category")
        )
        categories = [c for c in categories if c]
        product_types = list(
            qs.values_list("product__product_type", flat=True).distinct().order_by("product__product_type")
        )
        product_types = [p for p in product_types if p and p.strip()]
        positions = list(
            qs.values_list("product__position", flat=True).distinct().order_by("product__position")
        )
        positions = [p for p in positions if p and p.strip()]
        brands = list(
            qs.values_list("product__brand", flat=True).distinct().order_by("product__brand")
        )
        brands = [b for b in brands if b and b.strip()]
        return Response({
            "categories": categories,
            "product_types": product_types,
            "positions": positions,
            "brands": brands,
        })


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
