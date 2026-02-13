from django.urls import path

from .views import (
    InventoryListCreateView,
    InventoryDetailView,
    InventoryFilterOptionsView,
    LowStockAlertsView,
)

urlpatterns = [
    path("inventory/", InventoryListCreateView.as_view(), name="inventory-list"),
    path("inventory/filter-options/", InventoryFilterOptionsView.as_view(), name="inventory-filter-options"),
    path("inventory/low-stock/", LowStockAlertsView.as_view(), name="inventory-low-stock"),
    path("inventory/<int:pk>/", InventoryDetailView.as_view(), name="inventory-detail"),
]