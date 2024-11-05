from django.db import models
from django.contrib.auth.models import AbstractUser
from .superusermanager import CustomUserManager
from django.utils.translation import gettext_lazy as _

# Create your models here.
class CustomUser(AbstractUser):
    """
    Custom user model that extends the default Django user model.
    """
    class Location(models.TextChoices):
        LAGOS = 'Lagos', 'Lagos'
        ABUJA = 'Abuja', 'Abuja'
        KANO = 'Kano', 'Kano'
        OYO = 'Oyo', 'Oyo'
        KADUNA = 'Kaduna', 'Kaduna'
    
    username = None
    
    email = models.EmailField(_('email address'), unique=True)
    location = models.CharField(max_length=255, blank=True, choices=Location.choices, default=Location.LAGOS)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'location']
    
    objects = CustomUserManager()
    
    def __str__(self):
        return self.email
    