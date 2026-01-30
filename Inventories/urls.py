from django.urls import path

from .views import InventoryListCreateView, InventoryDetailView, LowStockAlertsView

urlpatterns = [
    path("inventory/", InventoryListCreateView.as_view(), name="inventory-list"),
    path("inventory/low-stock/", LowStockAlertsView.as_view(), name="inventory-low-stock"),
    path("inventory/<int:pk>/", InventoryDetailView.as_view(), name="inventory-detail"),
]