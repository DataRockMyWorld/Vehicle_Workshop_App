# workshop_app/permissions.py

from rest_framework import permissions


def user_site_id(user):
    """Return site_id for site-scoped user, else None (sees all)."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return None
    site = getattr(user, "site", None)
    return site.id if site else None


def filter_queryset_by_site(queryset, user, site_field="site"):
    """Filter queryset to user's site. Returns unfiltered for superuser or user with no site."""
    sid = user_site_id(user)
    if sid is None:
        return queryset
    return queryset.filter(**{f"{site_field}_id": sid})


class IsSuperUserOrReadOnly(permissions.BasePermission):
    """
    Superusers: full access. Others: read-only.
    """
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return request.method in permissions.SAFE_METHODS


class IsSuperUserOrSiteScoped(permissions.BasePermission):
    """
    Superuser or site=null: full access. Site user: access only if obj belongs to their site.
    Use has_object_permission; for list/detail, combine with queryset filtering.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        site = getattr(request.user, "site", None)
        if not site:
            return True
        obj_site = getattr(obj, "site", None)
        return obj_site is not None and obj_site.id == site.id


class IsCEOOrSuperuser(permissions.BasePermission):
    """
    Only CEO (can_see_all_sites) or superuser can access.
    Used for promotions management and SMS blast.
    """
    message = "Only CEO/admin can access this."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or getattr(request.user, "can_see_all_sites", False)


class IsReadOnlyForHQ(permissions.BasePermission):
    """
    CEO/MD (can_see_all_sites) = read-only. Site supervisors (user.site set) = full access.
    Apply alongside IsAuthenticated. HQ users see all data but cannot create/update/delete.
    """
    message = "CEO/HQ users have read-only access. Only site supervisors can make changes."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write allowed for site-scoped users (supervisors) or superuser
        if request.user.is_superuser:
            return True
        site = getattr(request.user, "site", None)
        return site is not None
