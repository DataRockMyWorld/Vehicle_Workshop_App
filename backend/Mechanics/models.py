from django.db import models
from Site.models import Site

class Mechanic(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="mechanics")
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)

    def __str__(self):
        return self.name
