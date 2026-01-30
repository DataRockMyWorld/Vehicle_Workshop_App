from django.contrib import admin
from .models import Site


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "contact_number", "manager")
    list_filter = ("location",)
    search_fields = ("name", "location", "contact_number")
    autocomplete_fields = ["manager"]
    ordering = ("name",)
