from django.db import models
from Customers.models import Customer

class Vehicle(models.Model):
    vehicle_type = models.CharField(max_length=50)
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    license_plate = models.CharField(max_length=50)
    
    def __str__(self):
        return f"{self.model} {self.make} {self.license_plate}"
    
