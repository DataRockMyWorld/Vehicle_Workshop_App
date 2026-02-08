"""Tests for dashboard and search APIs."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin


class DashboardAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_site_dashboard_returns_metrics(self):
        """Site-scoped user can access site dashboard with revenue/sales metrics."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("dashboard-site")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("revenue_today", data)
        self.assertIn("revenue_week", data)
        self.assertIn("sales_count_today", data)
        self.assertIn("sales_count_week", data)

    def test_ceo_dashboard_requires_hq_access(self):
        """CEO dashboard requires superuser or site=null (can_see_all_sites)."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("summary", response.data)
        self.assertIn("by_site", response.data)
        self.assertIn("sites", response.data)

    def test_site_user_gets_403_on_ceo_dashboard(self):
        """Site-scoped user cannot access CEO dashboard."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hq_user_can_access_ceo_dashboard(self):
        """HQ user (site=null, not superuser) can access CEO dashboard."""
        self.client.force_authenticate(user=self.hq_user)
        url = reverse("dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_activities_requires_hq(self):
        """Dashboard activities endpoint requires HQ access."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("dashboard-activities")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("activities", response.data)
        self.assertIsInstance(response.data["activities"], list)


class SearchAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_search_requires_auth(self):
        """Search endpoint requires authentication."""
        url = reverse("search")
        response = self.client.get(url, {"q": "john"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_short_query_returns_empty(self):
        """Search with query < 2 chars returns empty results."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("search")
        response = self.client.get(url, {"q": "j"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["service_requests"], [])
        self.assertEqual(response.data["customers"], [])
        self.assertEqual(response.data["vehicles"], [])

    def test_search_finds_customer_by_name(self):
        """Search finds customers by first/last name."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("search")
        response = self.client.get(url, {"q": "John"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customers = response.data["customers"]
        self.assertGreaterEqual(len(customers), 1)
        self.assertIn("John", customers[0]["title"])

    def test_search_finds_vehicle_by_license(self):
        """Search finds vehicles by license plate."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("search")
        response = self.client.get(url, {"q": "GC-1234"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vehicles = response.data["vehicles"]
        self.assertGreaterEqual(len(vehicles), 1)
        self.assertIn("GC-1234", vehicles[0]["title"])

    def test_site_user_search_scoped_to_site(self):
        """Site user search only returns results from their site."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("search")
        response = self.client.get(url, {"q": "Toyota"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Vehicle is at site_a, site_user is at site_a - should find it
        vehicles = response.data["vehicles"]
        self.assertGreaterEqual(len(vehicles), 1)
