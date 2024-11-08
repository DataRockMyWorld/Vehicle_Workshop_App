from django.db import models

class Promotion(models.Model):
    """
    Model representing a promotion"""
    title = models.CharField(max_length=100)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return f"{self.title} ({self.start_date} - {self.end_date})"
