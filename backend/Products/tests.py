from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin
from Products.models import Product


class ProductAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_product_list_authenticated(self):
        """Authenticated user can list products."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("product-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["name"], self.product.name)

    def test_superuser_can_create_product(self):
        """Superuser can create products."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("product-list")
        payload = {
            "name": "New Brake Disk",
            "sku": "BD-001",
            "unit_price": "200.00",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Brake Disk")

    def test_non_superuser_cannot_create_product(self):
        """Site user cannot create products (read-only)."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("product-list")
        payload = {
            "name": "Unauthorized Product",
            "unit_price": "50.00",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
