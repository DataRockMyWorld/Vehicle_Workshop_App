from django.contrib import admin
from .models import Mechanic


@admin.register(Mechanic)
class MechanicAdmin(admin.ModelAdmin):
    list_display = ("name", "phone_number", "site")
    list_filter = ("site",)
    search_fields = ("name", "phone_number")
    autocomplete_fields = ["site"]
    ordering = ("name",)
