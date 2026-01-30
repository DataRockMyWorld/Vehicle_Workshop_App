from django.urls import path

from .views import ActivePromotionListView

urlpatterns = [
    path("promotions/active/", ActivePromotionListView.as_view(), name="promotions-active"),
]
