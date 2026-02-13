"""
Thread-local storage for current user (set by middleware) so signals can access it.
"""
import threading

_audit_user = threading.local()


def set_audit_user(user):
    _audit_user.user = user


def get_audit_user():
    return getattr(_audit_user, "user", None)


def clear_audit_user():
    if hasattr(_audit_user, "user"):
        del _audit_user.user
