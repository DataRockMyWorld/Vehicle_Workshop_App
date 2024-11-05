from django.db import models
from Customers.models import Customer
from Vehicles.models import Vehicle
from Mechanics.models import Mechanic

# Create your models here.
class ServiceRequest(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    description = models.TextField()
    assigned_mechanic = models.ForeignKey(Mechanic, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('In Progress', 'In Progress'), ('Completed', 'Completed')])

    def __str__(self):
        return f"Service Request for {self.vehicle} - {self.status}"
