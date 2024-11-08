from .views import InvoiceListCreateView
from django.urls import path

urlpatterns = [
    path("invoices/", InvoiceListCreateView.as_view(), name="invoice-list-create"),
]