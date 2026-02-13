# Backend (Django API)

Django REST API for the Vehicle Workshop app. Run from project root with Docker, or from this directory for local dev.

## Quick commands (from project root)

```bash
# Docker
docker compose up -d
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py test

# Local (activate venv first)
cd backend && python manage.py migrate
cd backend && python manage.py runserver
```

See the main [README](../README.md) for full setup and environment variables.
