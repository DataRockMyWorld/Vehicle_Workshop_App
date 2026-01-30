from rest_framework import permissions


class CanSeeAllSites(permissions.BasePermission):
    """Only users who can see all sites (superuser or site=null) may access."""

    message = "You must have HQ/superuser access to view this dashboard."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "can_see_all_sites", False)
