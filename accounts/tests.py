from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from core.test_utils import WorkshopAPITestCaseMixin


class AuthAPITestCase(WorkshopAPITestCaseMixin, APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_login_returns_tokens(self):
        """POST /auth/login/ with valid credentials returns access and refresh tokens."""
        url = reverse("token_obtain_pair")
        payload = {"email": "admin@test.com", "password": "testpass123"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_credentials_returns_401(self):
        """POST /auth/login/ with wrong password returns 401."""
        url = reverse("token_obtain_pair")
        payload = {"email": "admin@test.com", "password": "wrongpass"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user(self):
        """GET /me/ returns authenticated user info."""
        self.client.force_authenticate(user=self.superuser)
        url = reverse("current-user")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "admin@test.com")
        self.assertIn("can_write", response.data)
        self.assertIn("can_see_all_sites", response.data)
