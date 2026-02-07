from .views import (
    ServiceRequestListCreateView,
    ServiceRequestDetailView,
    CompleteServiceRequestView,
    ProductUsageCreateView,
    ProductUsageListView,
    ProductUsageDetailView,
)
from django.urls import path

urlpatterns = [
    path("service_request/", ServiceRequestListCreateView.as_view(), name="service-request-list"),
    path("service_request/<int:pk>/", ServiceRequestDetailView.as_view(), name="service-request-detail"),
    path("service_request/<int:pk>/complete/", CompleteServiceRequestView.as_view(), name="service-request-complete"),
    path('product-usage/', ProductUsageCreateView.as_view(), name='product-usage-create'),
    path('product-usage/<int:service_request_id>/', ProductUsageListView.as_view(), name='product-usage-list'),
    path('product-usage-item/<int:pk>/', ProductUsageDetailView.as_view(), name='product-usage-detail'),
]
