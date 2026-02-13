from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsReadOnlyForHQ

from accounts.permissions import filter_queryset_by_site
from .models import Mechanic
from .serializers import MechanicSerializer


class MechanicListCreateView(generics.ListCreateAPIView):
    queryset = Mechanic.objects.select_related("site").all()
    serializer_class = MechanicSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        qs = filter_queryset_by_site(super().get_queryset(), self.request.user)
        return qs.order_by("name")

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if not site:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Site-scoped users must create mechanics for their site.")
            if serializer.validated_data.get("site") != site:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only create mechanics for your site.")
        serializer.save()


class MechanicDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Mechanic.objects.select_related("site").all()
    serializer_class = MechanicSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return filter_queryset_by_site(super().get_queryset(), self.request.user)