from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Product
from .serializers import ProductSerializer
from rest_framework import status

# Create your tests here.

class ProductTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.product = Product.objects.create(
            name = 'Test Product',
            unit_price = 10.00,
        )
    
    def test_product_list(self):
        url = reverse('product-list')
        response = self.client.get(url)
        serializer_data = ProductSerializer([self.product], many=True).data
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(serializer_data, response.data)
    