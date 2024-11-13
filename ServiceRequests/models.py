from django.db import models
from Customers.models import Customer
from Vehicles.models import Vehicle
from Mechanics.models import Mechanic
from Site.models import Site
from Products.models import Product


# Create your models here.
class ServiceRequest(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="service_requests")
    description = models.TextField()
    assigned_mechanic = models.ForeignKey(Mechanic, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('In Progress', 'In Progress'), ('Completed', 'Completed')])
    product_used = models.ManyToManyField(Product, through='ProductUsage')


    def __str__(self):
        return f"Service Request for {self.vehicle} - {self.status}"

class ProductUsage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    service_request = models.ForeignKey('ServiceRequest', on_delete=models.CASCADE)
    quantity_used = models.PositiveIntegerField()
