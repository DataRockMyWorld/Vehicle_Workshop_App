"""Tests for audit log API."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from audit.models import AuditLog
from core.test_utils import WorkshopAPITestCaseMixin


class AuditAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()
        cls.audit_entry = AuditLog.objects.create(
            action="create",
            model_label="test.Model",
            object_id="1",
            object_repr="Test",
            user=cls.superuser,
        )

    def test_audit_requires_auth(self):
        """Audit endpoint requires authentication."""
        url = reverse("audit-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_audit_requires_staff(self):
        """Audit endpoint requires staff or superuser."""
        from accounts.models import CustomUser
        regular = CustomUser.objects.create_user(
            email="regular@test.com",
            password="testpass123",
            first_name="Regular",
            last_name="User",
            is_staff=False,
        )
        self.client.force_authenticate(user=regular)
        url = reverse("audit-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Staff only", str(response.data))

    def test_staff_can_list_audit_logs(self):
        """Staff/superuser can list audit logs."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("audit-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(len(response.data["results"]), 1)
        entry = response.data["results"][0]
        self.assertIn("action", entry)
        self.assertIn("model_label", entry)
        self.assertIn("user", entry)
        self.assertIn("created_at", entry)
