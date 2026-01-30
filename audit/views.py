from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import filter_queryset_by_site, user_site_id
from .models import AuditLog


class AuditLogListView(APIView):
    """
    GET /api/v1/audit/ — recent changes.
    Admins/supervisors only. Site users see only their site's related changes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_staff and not user.is_superuser:
            return Response({"detail": "Staff only."}, status=403)

        qs = AuditLog.objects.select_related("user").order_by("-created_at")[:100]
        sid = user_site_id(user)
        # For now, return all for staff; could filter by site if we add site to AuditLog
        entries = [
            {
                "id": e.id,
                "action": e.action,
                "model_label": e.model_label,
                "object_id": e.object_id,
                "object_repr": e.object_repr,
                "changes": e.changes_json,
                "user": e.user.email if e.user else "System",
                "created_at": e.created_at.isoformat(),
            }
            for e in qs
        ]
        return Response({"results": entries})
