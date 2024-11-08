from .views import MechanicListCreateView, MechanicDetailView
from django.urls import path

urlpatterns = [
    path("mechanic/", MechanicListCreateView.as_view(), name="mechanic-list"),
    path("mechanic/<int:pk>/", MechanicDetailView.as_view(), name="mechanic-detail"),
]