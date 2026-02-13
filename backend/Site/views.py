from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsReadOnlyForHQ
from .models import Site
from .serializers import SiteSerializer


class SiteListCreateView(generics.ListCreateAPIView):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser or getattr(user, "site", None) is None:
            return qs
        return qs.filter(pk=user.site_id)

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superusers can create sites.")
        serializer.save()


class SiteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser or getattr(user, "site", None) is None:
            return qs
        return qs.filter(pk=user.site_id)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            site = getattr(user, "site", None)
            if not site or serializer.instance.id != site.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only update your own site.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only superusers can delete sites.")
        instance.delete()
