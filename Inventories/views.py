from .models import Inventory
from .serializers import InventorySerializer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

class InventoryListCreateView(generics.ListCreateAPIView):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        # Ensure only superuser can modify restricted fields
        if self.request.user.is_superuser:
            serializer.save()
        else:
            raise PermissionDenied("Only superuser can modify inventory.")
