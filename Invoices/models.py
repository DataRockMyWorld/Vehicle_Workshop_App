# Invoices/models.py

from django.db import models
from ServiceRequests.models import ServiceRequest

class Invoice(models.Model):
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice for {self.service_request.vehicle} - Paid: {self.paid}"
