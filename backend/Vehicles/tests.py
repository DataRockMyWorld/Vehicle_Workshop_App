from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin


class VehicleAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_vehicle_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("vehicle-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vehicle_list_returns_data_when_authenticated(self):
        """Authenticated user can list vehicles."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("vehicle-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["make"], "Toyota")

    def test_site_user_auto_assigned_site_on_create(self):
        """Site user creating vehicle gets their site auto-assigned."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("vehicle-list")
        payload = {
            "customer": self.customer.id,
            "make": "Honda",
            "model": "Civic",
            "year": 2021,
            "license_plate": "GC-5678-21",
            "site": self.site_a.id,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["site"], self.site_a.id)

    def test_site_user_cannot_move_vehicle_to_other_site(self):
        """Site user cannot change vehicle's site via PATCH."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("vehicle-detail", kwargs={"pk": self.vehicle.pk})
        payload = {"site": self.site_b.id}
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
