from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from core.test_utils import WorkshopAPITestCaseMixin
from Customers.models import Customer
from Invoices.models import Invoice
from Inventories.models import Inventory
from Mechanics.models import Mechanic
from Products.models import Product
from ServiceRequests.models import ProductUsage, ServiceCategory, ServiceRequest, ServiceType
from Site.models import Site
from Vehicles.models import Vehicle


class ServiceRequestAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
        cls.sr = ServiceRequest.objects.create(
            customer=cls.customer,
            vehicle=cls.vehicle,
            site=cls.site_a,
            service_type=cls.service_type,
            description="Regular oil change",
            status="Pending",
        )

    def test_service_request_auto_generates_display_number_on_save(self):
        """ServiceRequest gets SR-YYYY-NNNN display_number when created without one."""
        sr = ServiceRequest.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            site=self.site_a,
            service_type=self.service_type,
            description="Test SR",
            status="Pending",
        )
        self.assertTrue(sr.display_number)
        self.assertRegex(sr.display_number, r"^SR-\d{4}-\d{4}$")

    def test_service_request_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("service-request-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_service_request_list_returns_data_when_authenticated(self):
        """Authenticated superuser can list service requests."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)
        self.assertEqual(items[0]["status"], "Pending")

    def test_site_user_sees_only_own_site_requests(self):
        """Site-scoped user only sees service requests for their site."""
        sr_b = ServiceRequest.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            site=self.site_b,
            service_type=self.service_type,
            description="At Kumasi",
            status="Pending",
        )
        self.client.force_authenticate(user=self.site_user)
        url = reverse("service-request-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [x["id"] for x in (response.data if isinstance(response.data, list) else response.data.get("results", []))]
        self.assertIn(self.sr.id, ids)
        self.assertNotIn(sr_b.id, ids)

    def test_parts_only_filter_excludes_vehicle_requests(self):
        """parts_only=true returns only walk-in (no vehicle) requests."""
        walkin = Customer.objects.create(
            first_name="Walk-in",
            last_name="Customer",
            phone_number="0000000000",
        )
        sr_parts = ServiceRequest.objects.create(
            customer=walkin,
            vehicle=None,
            site=self.site_a,
            service_type=self.service_type,
            description="Brake pad sale only",
            status="Pending",
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-list")
        response = self.client.get(url, {"parts_only": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data if isinstance(response.data, list) else response.data.get("results", [])
        ids = [x["id"] for x in items]
        self.assertIn(sr_parts.id, ids)
        self.assertNotIn(self.sr.id, ids)

    def test_cannot_edit_completed_service_request(self):
        """PATCH on completed service request returns 400."""
        self.sr.status = "Completed"
        self.sr.save()
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-detail", kwargs={"pk": self.sr.pk})
        response = self.client.patch(url, {"description": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_delete_completed_service_request(self):
        """DELETE on completed service request returns 400."""
        self.sr.status = "Completed"
        self.sr.save()
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-detail", kwargs={"pk": self.sr.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complete_service_creates_invoice_and_adjusts_inventory(self):
        """Completing a service request creates invoice and deducts inventory."""
        ProductUsage.objects.create(
            service_request=self.sr,
            product=self.product,
            quantity_used=2,
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-complete", kwargs={"pk": self.sr.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.sr.refresh_from_db()
        self.assertEqual(self.sr.status, "Completed")

        self.assertTrue(Invoice.objects.filter(service_request=self.sr).exists())
        inv = Invoice.objects.get(service_request=self.sr)
        self.assertGreater(inv.total_cost, 0)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_on_hand, 8)

    def test_complete_service_insufficient_inventory_fails(self):
        """Completing with more product than in stock returns 400."""
        ProductUsage.objects.create(
            service_request=self.sr,
            product=self.product,
            quantity_used=999,
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-complete", kwargs={"pk": self.sr.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient inventory", str(response.data))

    def test_complete_service_no_inventory_record_fails(self):
        """Completing when product has no inventory at site returns 400."""
        new_product = Product.objects.create(name="NoStock", unit_price=Decimal("10"))
        ProductUsage.objects.create(
            service_request=self.sr,
            product=new_product,
            quantity_used=1,
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-complete", kwargs={"pk": self.sr.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No inventory record", str(response.data))

    def test_complete_already_completed_returns_400(self):
        """POST complete on already completed request returns 400."""
        self.sr.status = "Completed"
        self.sr.save()
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-complete", kwargs={"pk": self.sr.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Already completed", str(response.data))

    def test_complete_with_labor_cost(self):
        """Completing with labor_cost includes it in invoice."""
        ProductUsage.objects.create(
            service_request=self.sr,
            product=self.product,
            quantity_used=1,
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-complete", kwargs={"pk": self.sr.pk})
        response = self.client.post(
            url,
            {"labor_cost": "50.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inv = Invoice.objects.get(service_request=self.sr)
        self.assertGreaterEqual(inv.total_cost, Decimal("200"))  # 150 + 50

    def test_complete_negative_labor_cost_clamped_to_zero(self):
        """Negative labor_cost is clamped to 0."""
        ProductUsage.objects.create(
            service_request=self.sr,
            product=self.product,
            quantity_used=1,
        )
        self.client.force_authenticate(user=self.superuser)
        url = reverse("service-request-complete", kwargs={"pk": self.sr.pk})
        response = self.client.post(
            url,
            {"labor_cost": "-100"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.labor_cost, 0)

    def test_site_user_cannot_complete_other_site_request(self):
        """Site user cannot complete a service request from another site."""
        sr_other = ServiceRequest.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            site=self.site_b,
            service_type=self.service_type,
            description="At other site",
            status="Pending",
        )
        inv_b = Inventory.objects.create(
            product=self.product,
            site=self.site_b,
            quantity_on_hand=10,
        )
        ProductUsage.objects.create(
            service_request=sr_other,
            product=self.product,
            quantity_used=1,
        )
        self.client.force_authenticate(user=self.site_user)
        url = reverse("service-request-complete", kwargs={"pk": sr_other.pk})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_add_product_usage_to_completed_request(self):
        """Adding product usage to completed request fails."""
        self.sr.status = "Completed"
        self.sr.save()
        self.client.force_authenticate(user=self.superuser)
        url = reverse("product-usage-create")
        payload = {
            "service_request": self.sr.id,
            "product": self.product.id,
            "quantity_used": 1,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_product_usage_quantity_must_be_positive(self):
        """Product usage with quantity_used <= 0 is rejected."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("product-usage-create")
        payload = {
            "service_request": self.sr.id,
            "product": self.product.id,
            "quantity_used": 0,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_hq_user_cannot_create_service_request(self):
        """HQ user (no site) cannot create service requests."""
        self.client.force_authenticate(user=self.hq_user)
        url = reverse("service-request-list")
        payload = {
            "customer": self.customer.id,
            "vehicle": self.vehicle.id,
            "site": self.site_a.id,
            "description": "Test",
            "status": "Pending",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
