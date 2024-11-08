from .views import InventoryListCreateView
from django.urls import path

urlpatterns = [
    path("inventory/", InventoryListCreateView.as_view(), name="inventory-list"),
]