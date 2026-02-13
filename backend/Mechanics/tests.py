from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.test_utils import WorkshopAPITestCaseMixin


class MechanicAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_mechanic_list_requires_auth(self):
        """Unauthenticated requests get 401."""
        url = reverse("mechanic-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mechanic_list_returns_data_when_authenticated(self):
        """Authenticated user can list mechanics."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("mechanic-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json() if hasattr(response, "json") else response.data
        items = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(items), 1)

    def test_site_user_sees_only_own_site_mechanics(self):
        """Site-scoped user only sees mechanics for their site."""
        from Mechanics.models import Mechanic
        mech_b = Mechanic.objects.create(
            site=self.site_b,
            name="Kumasi Mechanic",
            phone_number="0559999888",
        )
        self.client.force_authenticate(user=self.site_user)
        url = reverse("mechanic-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [x["id"] for x in (response.data if isinstance(response.data, list) else response.data.get("results", []))]
        self.assertIn(self.mechanic.id, ids)
        self.assertNotIn(mech_b.id, ids)
