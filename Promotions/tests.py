from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin
from Promotions.models import Promotion


class PromotionAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
        today = timezone.now().date()
        cls.active_promotion = Promotion.objects.create(
            title="10% Off Brake Pads",
            description="This month only",
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=25),
            discount_percent=10,
        )
        cls.expired_promotion = Promotion.objects.create(
            title="Old Promo",
            description="Expired",
            start_date=today - timedelta(days=30),
            end_date=today - timedelta(days=1),
            discount_percent=5,
        )
        cls.future_promotion = Promotion.objects.create(
            title="Upcoming Promo",
            description="Not yet",
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=30),
            discount_percent=15,
        )

    def test_active_promotions_only_includes_current(self):
        """Active promotions endpoint returns only promotions where start <= today <= end."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("promotions-active")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        ids = [x["id"] for x in items]
        self.assertIn(self.active_promotion.id, ids)
        self.assertNotIn(self.expired_promotion.id, ids)
        self.assertNotIn(self.future_promotion.id, ids)
