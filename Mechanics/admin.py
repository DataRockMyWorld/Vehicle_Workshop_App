from django.contrib import admin
from .models import Mechanic

# Register your models here.
@admin.register(Mechanic)
class MechanicAdmin(admin.ModelAdmin):
    list_display = ('id','name', 'phone_number')
