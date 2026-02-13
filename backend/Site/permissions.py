# workshop_app/permissions.py

from rest_framework import permissions

class IsSuperUserOrSiteAdmin(permissions.BasePermission):
    """
    Custom permission to allow only superusers to access all sites,
    and regular users to access only their assigned site.
    """
    def has_permission(self, request, view):
        # Superusers have unrestricted access
        if request.user.is_superuser:
            return True
        # Regular users only have access to their own site
        site_id = view.kwargs.get('site_id')
        return request.user.site.id == int(site_id)
