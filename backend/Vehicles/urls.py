from .views import VehicleListCreateView, VehicleDetailView
from django.urls import path

urlpatterns = [
    path("vehicle/", VehicleListCreateView.as_view(), name="vehicle-list"),
    path("vehicle/<int:pk>/", VehicleDetailView.as_view(), name="vehicle-detail"),
]