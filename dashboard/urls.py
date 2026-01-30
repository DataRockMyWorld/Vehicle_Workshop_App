from django.urls import path

from .views import CsvExportView, DashboardActivitiesView, DashboardView, ReportsView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("activities/", DashboardActivitiesView.as_view(), name="dashboard-activities"),
    path("reports/", ReportsView.as_view(), name="reports"),
    path("export/", CsvExportView.as_view(), name="csv-export"),
]
