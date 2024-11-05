from django.db import models
from Products.models import Product

# Create your models here.
class Inventory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    restricted_edit = models.BooleanField(default=True)  # Only superusers can modify

    def __str__(self):
        return f"{self.product.name} - Quantity: {self.quantity}"