from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsReadOnlyForHQ
from .models import Promotion
from .serializers import PromotionSerializer


class ActivePromotionListView(generics.ListAPIView):
    """List promotions that are currently active (start_date <= today <= end_date)."""

    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        today = timezone.now().date()
        return Promotion.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        ).order_by("-start_date")
