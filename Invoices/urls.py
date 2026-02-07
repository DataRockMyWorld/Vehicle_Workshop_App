from django.urls import path

from .views import InvoiceListCreateView, InvoiceDetailView, InvoicePdfView

urlpatterns = [
    path("invoices/", InvoiceListCreateView.as_view(), name="invoice-list-create"),
    path("invoices/<int:pk>/pdf/", InvoicePdfView.as_view(), name="invoice-pdf"),
    path("invoices/<int:pk>/", InvoiceDetailView.as_view(), name="invoice-detail"),
]