from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin
from Products.models import Product


class InventoryAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_inventory_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("inventory-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inventory_list_returns_data_when_authenticated(self):
        """Authenticated user can list inventory."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("inventory-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)

    def test_site_user_sees_only_own_site_inventory(self):
        """Site-scoped user only sees inventory for their site."""
        prod_b = Product.objects.create(name="Product B", unit_price=Decimal("20"))
        from Inventories.models import Inventory
        inv_b = Inventory.objects.create(
            product=prod_b,
            site=self.site_b,
            quantity_on_hand=5,
        )
        self.client.force_authenticate(user=self.site_user)
        url = reverse("inventory-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [x["id"] for x in (response.data if isinstance(response.data, list) else response.data.get("results", []))]
        self.assertIn(self.inventory.id, ids)
        self.assertNotIn(inv_b.id, ids)

    def test_low_stock_alerts_returns_items_at_or_below_reorder_level(self):
        """Low stock endpoint returns only items at/below reorder level."""
        self.inventory.reorder_level = 15
        self.inventory.save()
        self.client.force_authenticate(user=self.superuser)
        url = reverse("inventory-low-stock")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alerts = response.data.get("alerts", [])
        self.assertGreaterEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["quantity_on_hand"], 10)
        self.assertEqual(alerts[0]["reorder_level"], 15)

    def test_reserved_cannot_exceed_on_hand(self):
        """Serializer rejects quantity_reserved > quantity_on_hand."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("inventory-detail", kwargs={"pk": self.inventory.pk})
        response = self.client.patch(
            url,
            {"quantity_reserved": 999},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_quantity_on_hand_rejected(self):
        """Serializer rejects negative quantity_on_hand."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("inventory-detail", kwargs={"pk": self.inventory.pk})
        response = self.client.patch(
            url,
            {"quantity_on_hand": -1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_site_user_cannot_create_restricted_inventory(self):
        """Site user cannot create inventory when restricted_edit=True."""
        prod = Product.objects.create(name="New Prod", unit_price=Decimal("5"))
        self.client.force_authenticate(user=self.site_user)
        url = reverse("inventory-list")
        payload = {
            "product": prod.id,
            "site": self.site_a.id,
            "quantity_on_hand": 10,
            "restricted_edit": True,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
