from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from Customers.models import Customer
from Site.models import Site
from Vehicles.models import Vehicle
from Mechanics.models import Mechanic
from .models import ServiceRequest, ServiceCategory, ServiceType


class ServiceRequestAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = CustomUser.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            first_name="Admin",
            last_name="User",
            is_superuser=True,
        )
        cls.site = Site.objects.create(
            name="Main Workshop",
            location="Accra",
            contact_number="0551234567",
        )
        cls.customer = Customer.objects.create(
            first_name="Jane",
            last_name="Smith",
            phone_number="0559876543",
            email="jane@example.com",
        )
        cls.vehicle = Vehicle.objects.create(
            make="Toyota",
            model="Camry",
            year=2020,
            customer=cls.customer,
            license_plate="GC-1234-20",
            site=cls.site,
        )
        cls.mechanic = Mechanic.objects.create(
            site=cls.site,
            name="Kwame",
            phone_number="0551112233",
        )
        cls.category, _ = ServiceCategory.objects.get_or_create(
            name="Test Mechanical", defaults={"order": 0}
        )
        cls.service_type, _ = ServiceType.objects.get_or_create(
            category=cls.category,
            name="Test Oil Change",
            defaults={"order": 0},
        )
        cls.sr = ServiceRequest.objects.create(
            customer=cls.customer,
            vehicle=cls.vehicle,
            site=cls.site,
            service_type=cls.service_type,
            description="Regular oil change",
            status="Pending",
        )

    def test_service_request_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("service-request-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_service_request_list_returns_data_when_authenticated(self):
        """Authenticated superuser can list service requests."""
        self.client.force_authenticate(user=self.user)
        url = reverse("service-request-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["status"], "Pending")
