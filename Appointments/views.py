from datetime import datetime, timedelta

from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ, filter_queryset_by_site
from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentListCreateView(generics.ListCreateAPIView):
    queryset = Appointment.objects.select_related(
        "customer", "vehicle", "site", "mechanic"
    ).all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return filter_queryset_by_site(super().get_queryset(), self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        site = getattr(user, "site", None)
        if site and serializer.validated_data.get("site") != site:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only create appointments for your site.")
        serializer.save()


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Appointment.objects.select_related(
        "customer", "vehicle", "site", "mechanic"
    ).all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get_queryset(self):
        return filter_queryset_by_site(super().get_queryset(), self.request.user)


class MechanicAvailabilityView(APIView):
    """GET /api/v1/appointments/availability/?mechanic_id=1&date=2025-01-30&site_id=1"""

    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]

    def get(self, request):
        mechanic_id = request.query_params.get("mechanic_id")
        date_str = request.query_params.get("date")
        site_id = request.query_params.get("site_id")
        if not mechanic_id or not date_str or not site_id:
            return Response(
                {"error": "mechanic_id, date, and site_id are required"},
                status=400,
            )
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "date must be YYYY-MM-DD"}, status=400)
        qs = Appointment.objects.filter(
            mechanic_id=mechanic_id,
            site_id=site_id,
            scheduled_date=target_date,
        ).exclude(status__in=["cancelled", "no_show", "completed"])
        slots = [
            {
                "scheduled_time": a.scheduled_time.strftime("%H:%M"),
                "duration_minutes": a.duration_minutes,
                "id": a.id,
            }
            for a in qs.order_by("scheduled_time")
        ]
        return Response({"busy_slots": slots})
