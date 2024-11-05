from django.db import models

# Create your models here.
class Customer(models.Model):
    """
    Model representing a customer
    """
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(null=True, blank=True)
    phone_number = models.IntegerField(null=False)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
