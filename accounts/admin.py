from django.contrib import admin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'is_staff', 'location']
    list_filter = ['email', 'location']
    

# Register your models here.
