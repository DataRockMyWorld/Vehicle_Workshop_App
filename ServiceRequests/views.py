from .models import ServiceRequest, ProductUsage
from .serializers import ServiceRequestSerializer, ProductUsageSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from accounts.permissions import IsSuperUserOrSiteAdmin
from rest_framework.exceptions import ValidationError


class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsSuperUserOrSiteAdmin]
    
    def get_queryset(self):
        user = self.request.user
        # Superusers access all data
        if user.is_superuser:
            return ServiceRequest.objects.all()
        # Regular users access only their site-specific data
        return ServiceRequest.objects.filter(site=user.site)
    
    
class ServiceRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceRequestSerializer
    queryset = ServiceRequest.objects.all()
    permission_classes = [IsSuperUserOrSiteAdmin]



# services/views.py


class ProductUsageCreateView(generics.CreateAPIView):
    """
    Allows adding a product usage entry to a specific service request.
    """
    queryset = ProductUsage.objects.all()
    serializer_class = ProductUsageSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        service_request = serializer.validated_data['service_request']
        if service_request.status == 'Completed':
            raise ValidationError("Cannot add products to a completed service request.")
        serializer.save()

class ProductUsageListView(generics.ListAPIView):
    """
    Retrieves all product usage entries for a specific service request.
    """
    serializer_class = ProductUsageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        service_request_id = self.kwargs['service_request_id']
        return ProductUsage.objects.filter(service_request_id=service_request_id)
