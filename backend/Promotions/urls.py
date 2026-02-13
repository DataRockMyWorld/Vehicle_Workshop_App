from django.urls import path

from .views import (
    ActivePromotionListView,
    PromotionDetailView,
    PromotionListCreateView,
    SmsBlastHistoryListView,
    SmsBlastPreviewView,
    SmsBlastView,
)

urlpatterns = [
    path("promotions/active/", ActivePromotionListView.as_view(), name="promotions-active"),
    path("promotions/", PromotionListCreateView.as_view(), name="promotions-list-create"),
    path("promotions/sms-history/", SmsBlastHistoryListView.as_view(), name="promotions-sms-history"),
    path("promotions/<int:pk>/", PromotionDetailView.as_view(), name="promotions-detail"),
    path("promotions/<int:pk>/sms-blast-preview/", SmsBlastPreviewView.as_view(), name="promotions-sms-blast-preview"),
    path("promotions/<int:pk>/sms-blast/", SmsBlastView.as_view(), name="promotions-sms-blast"),
]
