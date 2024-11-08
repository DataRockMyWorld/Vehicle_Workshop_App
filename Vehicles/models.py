from django.db import models
from Customers.models import Customer
from Site.models import Site

class Vehicle(models.Model):
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    license_plate = models.CharField(max_length=50)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="vehicles")
    
    def __str__(self):
        return f"{self.model} {self.make} {self.license_plate}"
    
