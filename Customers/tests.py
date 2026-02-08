from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from core.test_utils import WorkshopAPITestCaseMixin
from Site.models import Site
from .models import Customer


class CustomerAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
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
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["first_name"], "John")

    def test_create_customer_valid_data(self):
        """Valid customer creation succeeds."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-list-create")
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone_number": "0241234567",
            "email": "jane@example.com",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["first_name"], "Jane")
        self.assertEqual(response.data["phone_number"], "0241234567")

    def test_create_customer_phone_too_short(self):
        """Phone number under 6 chars is rejected."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-list-create")
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone_number": "123",
            "email": "jane@example.com",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone_number", response.data)

    def test_create_customer_phone_whitespace_stripped(self):
        """Phone number with spaces is cleaned and accepted."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-list-create")
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone_number": "055 123 4567",
            "email": "jane@example.com",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["phone_number"], "0551234567")

    def test_create_customer_email_optional(self):
        """Customer can be created without email (walk-in)."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-list-create")
        payload = {
            "first_name": "Walk-in",
            "last_name": "Customer",
            "phone_number": "0550000000",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data.get("email"))

    def test_hq_user_cannot_create_customer(self):
        """HQ/CEO user (no site) has read-only access."""
        self.client.force_authenticate(user=self.hq_user)
        url = reverse("customer-list-create")
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone_number": "0551234567",
            "email": "jane@example.com",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hq_user_can_list_customers(self):
        """HQ user can read customer list."""
        self.client.force_authenticate(user=self.hq_user)
        url = reverse("customer-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_site_user_can_create_customer(self):
        """Site supervisor can create customers."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("customer-list-create")
        payload = {
            "first_name": "Kofi",
            "last_name": "Mensah",
            "phone_number": "0553334444",
            "email": "kofi@example.com",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_walkin_customer_created_on_first_request(self):
        """GET walkin creates walk-in customer if none exists."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-walkin")
        Customer.objects.filter(
            first_name="Walk-in",
            last_name="Customer",
            phone_number="0000000000",
        ).delete()
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Walk-in")
        self.assertEqual(response.data["last_name"], "Customer")
        self.assertEqual(response.data["phone_number"], "0000000000")

    def test_walkin_customer_reused_on_subsequent_requests(self):
        """GET walkin returns existing walk-in customer."""
        self.client.force_authenticate(user=self.superuser)
        walkin = Customer.objects.create(
            first_name="Walk-in",
            last_name="Customer",
            phone_number="0000000000",
            receive_service_reminders=False,
        )
        url = reverse("customer-walkin")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], walkin.id)

    def test_update_customer(self):
        """Customer update succeeds."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-detail", kwargs={"pk": self.customer.pk})
        payload = {"first_name": "Jonathan", "last_name": "Doe", "phone_number": "0551234567"}
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.first_name, "Jonathan")

    def test_delete_customer(self):
        """Customer deletion succeeds."""
        cust = Customer.objects.create(
            first_name="Temp",
            last_name="Customer",
            phone_number="0559999999",
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("customer-detail", kwargs={"pk": cust.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Customer.objects.filter(pk=cust.pk).exists())
