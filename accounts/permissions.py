# workshop_app/permissions.py

from rest_framework import permissions

class IsSuperUserOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow only superusers to perform write operations,
    while read-only access is available to others.
    """
    def has_permission(self, request, view):
        # Superusers have unrestricted access
        if request.user.is_superuser:
            return True
        # Non-superusers have read-only access
        return request.method in permissions.SAFE_METHODS

class IsSuperUserOrSiteAdmin(permissions.BasePermission):
    """
    Custom permission to allow superusers access to all sites,
    and regular admins to access only their assigned site data.
    """
    def has_object_permission(self, request, view, obj):
        # Superusers have unrestricted access
        if request.user.is_superuser:
            return True
        # Regular admins can only access data for their assigned site
        return obj.site == request.user.site
