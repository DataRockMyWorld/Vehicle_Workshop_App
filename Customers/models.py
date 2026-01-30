from django.db import models

# Create your models here.
class Customer(models.Model):
    """
    Model representing a customer
    """
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(null=True, blank=True)
    phone_number = models.CharField(max_length=20)
    receive_service_reminders = models.BooleanField(
        default=True,
        help_text="Send automatic SMS/email reminders when vehicle service is due.",
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
