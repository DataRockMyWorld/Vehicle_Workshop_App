from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from .models import Customer


class CustomerAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = CustomUser.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            first_name="Admin",
            last_name="User",
            is_superuser=True,
        )
        cls.customer = Customer.objects.create(
            first_name="John",
            last_name="Doe",
            phone_number="0551234567",
            email="john@example.com",
        )

    def test_customer_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("customer-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_list_returns_data_when_authenticated(self):
        """Authenticated superuser can list customers."""
        self.client.force_authenticate(user=self.user)
        url = reverse("customer-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["first_name"], "John")
