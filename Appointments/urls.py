from django.urls import path

from .views import (
    AppointmentListCreateView,
    AppointmentDetailView,
    MechanicAvailabilityView,
)

urlpatterns = [
    path("", AppointmentListCreateView.as_view(), name="appointment-list-create"),
    path("availability/", MechanicAvailabilityView.as_view(), name="mechanic-availability"),
    path("<int:pk>/", AppointmentDetailView.as_view(), name="appointment-detail"),
]
