from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsReadOnlyForHQ, filter_queryset_by_site
from .models import Vehicle
from .serializers import VehicleSerializer


class VehicleListCreateView(generics.ListCreateAPIView):
    queryset = Vehicle.objects.select_related("customer", "site").all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        qs = filter_queryset_by_site(super().get_queryset(), self.request.user)
        return qs.order_by("-id")

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if not site:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Site-scoped users must create vehicles for their site.")
            # Auto-set site for site supervisors (ignore client value for security)
            serializer.validated_data["site"] = site
        serializer.save()


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Vehicle.objects.select_related("customer", "site").all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return filter_queryset_by_site(super().get_queryset(), self.request.user)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if not site:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Site-scoped users cannot update vehicles.")
            # Site user cannot change vehicle to another site
            new_site = serializer.validated_data.get("site")
            if new_site and new_site.id != site.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You cannot move a vehicle to another site.")
        serializer.save()
