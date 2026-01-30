from django.db import models
from django.contrib.auth.models import AbstractUser

from .superusermanager import CustomUserManager
from django.utils.translation import gettext_lazy as _


class CustomUser(AbstractUser):
    """
    Custom user model. site=None (or is_superuser) => HQ sees all sites.
    site set => user is scoped to that site only.
    """
    username = None
    email = models.EmailField(_("email address"), unique=True)
    phone_number = models.CharField(_("phone number"), max_length=20, blank=True)
    location = models.CharField(_("location"), max_length=255, blank=True)
    site = models.ForeignKey(
        "Site.Site",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff",
        help_text="If set, user only sees data for this site. Null = HQ / all sites.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    @property
    def can_see_all_sites(self):
        """True if user sees data from all sites (superuser or no site assigned)."""
        return self.is_superuser or self.site_id is None
    