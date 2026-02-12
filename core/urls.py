"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from accounts.views import EmailTokenObtainPairView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from . import views
from dashboard.views_search import SearchView
from ServiceRequests.views import ServiceCategoriesView

urlpatterns = [
    path("health/", views.health),
    path("admin/", admin.site.urls),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("api/v1/search/", SearchView.as_view(), name="search"),
    path("api/v1/audit/", include("audit.urls")),
    path("api/v1/service-categories/", ServiceCategoriesView.as_view(), name="service-categories"),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("Customers.urls")),
    path("api/v1/", include("Inventories.urls")),
    path("api/v1/", include("Mechanics.urls")),
    path("api/v1/", include("ServiceRequests.urls")),
    path("api/v1/", include("Vehicles.urls")),
    path("api/v1/", include("Invoices.urls")),
    path("api/v1/", include("Products.urls")),
    path("api/v1/", include("Promotions.urls")),
    path("api/v1/", include("Site.urls")),
    path("api-auth/", include("rest_framework.urls")),
    path('auth/login/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
