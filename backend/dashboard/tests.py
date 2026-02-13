"""Tests for dashboard and search APIs."""
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin
from Invoices.models import Invoice


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


class SalesReportAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
        cls.service_request.status = "Completed"
        cls.service_request.save()
        cls.invoice = Invoice.objects.create(
            service_request=cls.service_request,
            subtotal=Decimal("100.00"),
            discount_amount=Decimal("0"),
            total_cost=Decimal("100.00"),
            paid=True,
            payment_method="cash",
        )

    def test_sales_report_requires_auth(self):
        """Sales report requires authentication."""
        url = reverse("sales-report")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sales_report_returns_audit_structure(self):
        """Sales report returns audit-ready structure with metadata and transactions."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("sales-report")
        response = self.client.get(url, {"period": "30"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("report_metadata", data)
        self.assertIn("summary", data)
        self.assertIn("by_site", data)
        self.assertIn("by_date", data)
        self.assertIn("by_payment_method", data)
        self.assertIn("transactions", data)
        meta = data["report_metadata"]
        self.assertEqual(meta["report_type"], "sales_report")
        self.assertIn("generated_at", meta)
        self.assertIn("date_from", meta)
        self.assertIn("date_to", meta)
        summary = data["summary"]
        self.assertIn("total_revenue", summary)
        self.assertIn("total_sales_count", summary)
        self.assertIn("paid_revenue", summary)
        self.assertIn("unpaid_revenue", summary)

    def test_sales_report_respects_date_range(self):
        """Sales report accepts date_from and date_to for explicit range."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("sales-report")
        response = self.client.get(url, {
            "date_from": "2025-01-01",
            "date_to": "2025-01-31",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        meta = response.data["report_metadata"]
        self.assertEqual(meta["date_from"], "2025-01-01")
        self.assertEqual(meta["date_to"], "2025-01-31")

    def test_sales_report_invalid_date_returns_400(self):
        """Invalid date params return 400."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("sales-report")
        response = self.client.get(url, {"date_from": "invalid", "date_to": "2025-01-31"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_sales_report_site_user_sees_own_site_only(self):
        """Site user receives report scoped to their site."""
        self.client.force_authenticate(user=self.site_user)
        url = reverse("sales-report")
        response = self.client.get(url, {"period": "30"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        meta = response.data["report_metadata"]
        self.assertIn("site_id", meta["scope"])
        summary = response.data["summary"]
        self.assertGreaterEqual(int(summary["total_sales_count"]), 1)

    def test_sales_report_transactions_traceable(self):
        """Transactions list includes invoice_id and service_request_id for audit traceability."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("sales-report")
        response = self.client.get(url, {"period": "30"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transactions = response.data["transactions"]
        self.assertGreaterEqual(len(transactions), 1)
        t = transactions[0]
        self.assertIn("invoice_id", t)
        self.assertIn("service_request_id", t)
        self.assertIn("site_id", t)
        self.assertIn("total_cost", t)
        self.assertIn("created_at", t)


class CsvExportDateRangeTestCase(WorkshopAPITestCaseMixin, APITestCase):
    """Tests for CSV export with date range params."""

    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
        cls.service_request.status = "Completed"
        cls.service_request.save()
        Invoice.objects.create(
            service_request=cls.service_request,
            subtotal=Decimal("100.00"),
            total_cost=Decimal("100.00"),
        )

    def test_export_invoices_with_date_range(self):
        """CSV export accepts date_from and date_to for invoices."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("csv-export")
        response = self.client.get(url, {
            "resource": "invoices",
            "date_from": "2025-01-01",
            "date_to": "2025-12-31",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response.get("Content-Type", ""))
        self.assertIn("invoice", response.get("Content-Disposition", "").lower())

    def test_export_invalid_date_returns_400(self):
        """Export with invalid date params returns 400."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("csv-export")
        response = self.client.get(url, {
            "resource": "invoices",
            "date_from": "bad",
            "date_to": "2025-01-31",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
