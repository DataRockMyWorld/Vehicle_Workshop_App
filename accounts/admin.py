from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import CustomUser


class CustomUserCreationForm(UserCreationForm):
    """Creates user with properly hashed password. Uses email instead of username."""

    class Meta:
        model = CustomUser
        fields = ("email", "first_name", "last_name", "phone_number", "location", "site")

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if not email:
            return email
        # Normalize so stored email matches login lookup (e.g. User@x.com -> user@x.com)
        email = CustomUser.objects.normalize_email(email)
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError(self.instance.unique_error_message(CustomUser, ["email"]))
        return email

    def save(self, commit=True):
        # Use the manager so password is hashed and is_active=True, same as createsuperuser
        user = CustomUser.objects.create_user(
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password1"],
            first_name=self.cleaned_data.get("first_name", ""),
            last_name=self.cleaned_data.get("last_name", ""),
            phone_number=self.cleaned_data.get("phone_number", ""),
            location=self.cleaned_data.get("location", ""),
            site=self.cleaned_data.get("site"),
        )
        return user

    def save_m2m(self):
        """No M2M fields in add form; admin expects this to exist."""
        pass


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = "__all__"


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_display = ["email", "first_name", "last_name", "phone_number", "is_staff", "is_superuser", "is_active", "site"]
    list_editable = ["is_active"]
    list_filter = ["is_staff", "is_superuser", "is_active", "site", "location"]
    search_fields = ["email", "first_name", "last_name", "phone_number"]
    ordering = ["email"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone_number", "location", "site")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
        ("Personal info", {"classes": ("wide",), "fields": ("first_name", "last_name", "phone_number", "location", "site")}),
    )

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Force location to be a text input, not a dropdown."""
        if db_field.name == "location":
            kwargs["widget"] = forms.TextInput(attrs={"size": 40})
        return super().formfield_for_dbfield(db_field, request, **kwargs)
