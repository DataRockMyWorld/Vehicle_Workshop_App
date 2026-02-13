from django.urls import path

from .views import CsvExportView, DashboardActivitiesView, DashboardView, ReportsView, SalesReportView, SiteDashboardView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("site/", SiteDashboardView.as_view(), name="dashboard-site"),
    path("activities/", DashboardActivitiesView.as_view(), name="dashboard-activities"),
    path("reports/", ReportsView.as_view(), name="reports"),
    path("sales-report/", SalesReportView.as_view(), name="sales-report"),
    path("export/", CsvExportView.as_view(), name="csv-export"),
]
