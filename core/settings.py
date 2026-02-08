from pathlib import Path
from datetime import timedelta
import os
import environ

env = environ.Env(DEBUG=(bool, True))

BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    environ.Env.read_env(str(env_path))

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
_allowed = env("ALLOWED_HOSTS", default="localhost,127.0.0.1")
ALLOWED_HOSTS = [x.strip() for x in _allowed.split(",") if x.strip()]

# Database
if env("DATABASE_URL", default=""):
    DATABASES = {"default": env.db()}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Celery
_default_broker = "redis://localhost:6379/0"
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=_default_broker)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default=CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
# Beat schedule file: use /tmp in containers so appuser can always write (avoids permission denied)
CELERY_BEAT_SCHEDULE_FILENAME = env("CELERY_BEAT_SCHEDULE_FILENAME", default="/tmp/celerybeat-schedule")

# Twilio (optional – app starts without; tasks fail at send if missing)
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_PHONE_NUMBER = env("TWILIO_PHONE_NUMBER", default="")
# When False (default): log SMS to console so you can confirm flows in dev.
# Set USE_TWILIO_SMS=True and Twilio creds to send real SMS.
USE_TWILIO_SMS = env.bool("USE_TWILIO_SMS", default=False)

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts.apps.AccountsConfig",
    "Customers.apps.CustomersConfig",
    "Vehicles.apps.VehiclesConfig",
    "Invoices.apps.InvoicesConfig",
    "Mechanics.apps.MechanicsConfig",
    "Inventories.apps.InventoriesConfig",
    "Products.apps.ProductsConfig",
    "ServiceRequests.apps.ServiceRequestsConfig",
    "Appointments.apps.AppointmentsConfig",
    "audit.apps.AuditConfig",
    "Site.apps.SiteConfig",
    "Promotions.apps.PromotionsConfig",
    "dashboard.apps.DashboardConfig",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "audit.middleware.AuditUserMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"

# Cache for rate limiting (login throttle). LocMemCache is per-process; Redis recommended for multi-worker.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "login": "5/minute",
    },
}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.CustomUser"

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Vehicle Workshop Management API",
    "DESCRIPTION": "REST API for vehicle workshop operations: customers, vehicles, service requests, inventory, invoicing, and reporting. Authenticate via JWT (login/refresh) before calling protected endpoints.",
    "VERSION": "1.0.0",
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]+/",
    "TAGS": [
        {"name": "auth", "description": "Authentication (JWT login, refresh, logout)"},
        {"name": "customers", "description": "Customer records and walk-in sales"},
        {"name": "vehicles", "description": "Vehicle records linked to customers"},
        {"name": "mechanic", "description": "Mechanics assigned to sites"},
        {"name": "service_request", "description": "Service requests and product usage"},
        {"name": "invoices", "description": "Invoicing and payments"},
        {"name": "inventory", "description": "Stock and low-stock alerts"},
        {"name": "products", "description": "Product catalog and search"},
        {"name": "sites", "description": "Workshop sites/locations"},
        {"name": "appointments", "description": "Service appointment scheduling"},
        {"name": "dashboard", "description": "CEO/site dashboards and reports"},
        {"name": "audit", "description": "Audit trail of changes"},
        {"name": "promotions", "description": "Active promotions"},
    ],
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
        "filter": True,
    },
    "SERVERS": [{"url": "/", "description": "Current host"}],
}

# Jazzmin admin theme
JAZZMIN_SETTINGS = {
    "site_title": "Vehicle Workshop",
    "site_header": "Vehicle Workshop Admin",
    "site_brand": "Workshop Admin",
    "site_logo": None,
    "login_logo": None,
    "welcome_sign": "Vehicle Workshop Management",
    "copyright": "Vehicle Workshop",
    "search_model": ["accounts.CustomUser", "ServiceRequests.ServiceRequest", "Customers.Customer"],
    "user_avatar": None,
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
    ],
    "usermenu_links": [],
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": [
        "accounts",
        "Site",
        "Customers",
        "Vehicles",
        "Mechanics",
        "Products",
        "Inventories",
        "ServiceRequests",
        "Invoices",
        "Promotions",
    ],
    "custom_css": None,
    "custom_js": None,
    "show_ui_builder": False,
}
JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "sidebar_fixed": True,
    "sidebar_nav_small_text": True,
}
