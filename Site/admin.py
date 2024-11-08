from django.contrib import admin
from .models import Site

@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'contact_number', 'manager')
    search_fields = ('name', 'location')
