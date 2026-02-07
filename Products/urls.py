from .views import ProductListCreateView, ProductDetailView, ProductImportExcelView, ProductSearchView
from django.urls import path

urlpatterns = [
    path("products/", ProductListCreateView.as_view(), name="product-list"),
    path("products/search/", ProductSearchView.as_view(), name="product-search"),
    path("products/import-excel/", ProductImportExcelView.as_view(), name="product-import-excel"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product"),
]