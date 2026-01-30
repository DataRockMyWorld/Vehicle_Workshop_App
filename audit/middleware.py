"""Middleware to capture current user for audit logging."""
from .utils import set_audit_user, clear_audit_user


class AuditUserMiddleware:
    """Set request.user in thread-local for audit signals."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            set_audit_user(request.user)
        try:
            return self.get_response(request)
        finally:
            clear_audit_user()
