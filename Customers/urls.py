from .views import CustomerListCreateView, CustomerDetailView, WalkinCustomerView
from django.urls import path

urlpatterns = [
    path("customers/", CustomerListCreateView.as_view(), name="customer-list-create"),
    path("customers/walkin/", WalkinCustomerView.as_view(), name="customer-walkin"),
    path("customers/<int:pk>/", CustomerDetailView.as_view(), name="customer-detail"),
]