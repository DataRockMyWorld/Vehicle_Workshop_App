from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin
from Invoices.models import Invoice, PaymentMethod
from ServiceRequests.models import ProductUsage


class InvoiceAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
        ProductUsage.objects.create(
            service_request=cls.service_request,
            product=cls.product,
            quantity_used=2,
        )
        from ServiceRequests.tasks import complete_service
        from django.db import transaction
        with transaction.atomic():
            complete_service(cls.service_request.id)
        cls.invoice = Invoice.objects.get(service_request=cls.service_request)

    def test_invoice_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("invoice-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invoice_list_returns_data_when_authenticated(self):
        """Authenticated user can list invoices."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("invoice-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)

    def test_mark_invoice_as_paid(self):
        """PATCH to set paid=True and payment_method succeeds."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("invoice-detail", kwargs={"pk": self.invoice.pk})
        response = self.client.patch(
            url,
            {"paid": True, "payment_method": PaymentMethod.CASH},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.invoice.refresh_from_db()
        self.assertTrue(self.invoice.paid)
        self.assertEqual(self.invoice.payment_method, PaymentMethod.CASH)

    def test_invoice_pdf_download(self):
        """GET invoice PDF returns 200 and pdf content-type."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("invoice-pdf", kwargs={"pk": self.invoice.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("application/pdf", response.get("Content-Type", ""))
        self.assertGreater(len(response.content), 100)

    def test_site_user_cannot_see_other_site_invoice(self):
        """Site user cannot access invoice from another site."""
        from ServiceRequests.models import ServiceRequest
        from Customers.models import Customer
        cust = Customer.objects.create(
            first_name="Other",
            last_name="Customer",
            phone_number="0558888777",
        )
        sr_other = ServiceRequest.objects.create(
            customer=cust,
            vehicle=None,
            site=self.site_b,
            service_type=self.service_type,
            description="Other site",
            status="Completed",
        )
        inv_other = Invoice.objects.create(
            service_request=sr_other,
            subtotal=Decimal("100"),
            total_cost=Decimal("100"),
        )
        self.client.force_authenticate(user=self.site_user)
        url = reverse("invoice-detail", kwargs={"pk": inv_other.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
