from django.contrib import admin
from .models import Invoice

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """
    Admin View for Invoice
    """
    list_display = ('id', 'service_request', 'paid', 'created_at', 'updated_at')
    search_fields = ('paid', 'service_request')
    
    
    

# Register your models here.
