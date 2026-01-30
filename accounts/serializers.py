"""
Custom JWT serializers for email-based authentication.
"""
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Accepts 'email' and 'password'. Normalizes email before authentication
    so that User@Example.com matches user@example.com (stored with normalize_email).
    """

    def validate(self, attrs):
        User = get_user_model()
        raw_email = attrs.get(User.USERNAME_FIELD) or ""
        if raw_email:
            attrs[User.USERNAME_FIELD] = User.objects.normalize_email(raw_email)
        return super().validate(attrs)
