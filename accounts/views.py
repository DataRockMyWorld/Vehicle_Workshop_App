from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import EmailTokenObtainPairSerializer


class CurrentUserView(APIView):
    """Returns current user info including can_write (False for CEO/HQ read-only)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        site = getattr(user, "site", None)
        can_write = site is not None  # Site supervisors can write; HQ/CEO read-only
        return Response({
            "email": user.email,
            "can_write": can_write,
            "can_see_all_sites": getattr(user, "can_see_all_sites", user.is_superuser or site is None),
            "site_id": site.id if site else None,
        })


class LoginRateThrottle(AnonRateThrottle):
    """Limit login attempts to 5 per minute per IP to deter brute-force."""
    scope = "login"


class EmailTokenObtainPairView(TokenObtainPairView):
    """JWT login view that accepts email (normalized) and password."""
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]
