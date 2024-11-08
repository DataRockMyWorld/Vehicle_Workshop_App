from .views import ServiceRequestListCreateView, ServiceRequestDetailView, ProductUsageCreateView, ProductUsageListView
from django.urls import path

urlpatterns = [
    path("service_request/", ServiceRequestListCreateView.as_view(), name="service-request-list"),
    path("service_request/<int:pk>/", ServiceRequestDetailView.as_view(), name="service-request-detail"),
    path('product-usage/', ProductUsageCreateView.as_view(), name='product-usage-create'),
    path('product-usage/<int:service_request_id>/', ProductUsageListView.as_view(), name='product-usage-list'),
]
