from .views import SiteListCreateView, SiteDetailView
from django.urls import path

urlpatterns = [
    path('sites/', SiteListCreateView.as_view(), name='site-list'),
    path('sites/<int:pk>/', SiteDetailView.as_view(), name='site-detail'),
]