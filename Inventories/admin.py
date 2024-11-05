from django.contrib import admin
from .models import Inventory

# Register your models here.

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'quantity', 'product', 'restricted_edit')
    search_fields = ('product',)
