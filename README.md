
# Vehicle Workshop Management App

A Django-based management application for vehicle workshops. This app helps workshop administrators manage customers, vehicles, service requests, mechanics, and inventory. It supports multi-site management, notifications via SMS/WhatsApp, automated service reminders, promotional notifications, and invoice generation.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Docker](#docker)
- [Frontend](#frontend)
- [Celery and Redis](#celery-and-redis)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Service Requests](#service-requests)
  - [Product Usage](#product-usage)
  - [Invoices](#invoices)
  - [Notifications](#notifications)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)

---

## Features

- **Customer and Vehicle Management**: Manage customer details and their associated vehicles.
- **Service Request Management**: Create, assign, and complete service requests.
- **Mechanic Assignment and Notifications**: Notify mechanics of assigned tasks.
- **Inventory Management**: Track product usage and automatically adjust inventory upon service completion.
- **Invoicing and Payment Tracking**: Generate invoices for completed services and track payment status.
- **Automated Notifications**:
  - **Service Reminders**: Send reminders to customers when service is due.
  - **Promotional Notifications**: Notify customers about active promotions.
- **Multi-Site Management**: Supports multiple workshop locations with superuser-level access to all sites.

## Tech Stack

- **Backend**: Django, Django REST Framework (DRF)
- **Task Queue**: Celery with Redis as a message broker
- **Notifications**: Twilio for SMS/WhatsApp
- **Authentication**: JWT Authentication via `djangorestframework-simplejwt`

---

## Setup Instructions

### Prerequisites

- Python 3.8+
- Redis server (for Celery)
- Twilio account for SMS (optional). By default, notifications are logged to the console so you can confirm flows in development; set `USE_TWILIO_SMS=True` and Twilio credentials to send real SMS.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/vehicle-workshop-management.git
   cd vehicle-workshop-management
   ```

2. **Create and Activate a Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Environment Variables

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

See `.env.example` for all supported variables. Required: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`. For Docker, Postgres and Redis URLs are set by Compose.

### Running the Application

1. **Apply Migrations**:
   ```bash
   python manage.py migrate
   ```

2. **Create a Superuser**:
   ```bash
   python manage.py createsuperuser
   ```

3. **Start the Django Server**:
   ```bash
   python manage.py runserver
   ```

4. **Start Redis Server**:
   ```bash
   redis-server
   ```

5. **Start Celery Workers and Scheduler**:
   - In separate terminals, run the following:

   ```bash
   celery -A core worker -l info
   celery -A core beat -l info
   ```

---

## Docker

Run the full stack (Django, Celery worker, Celery beat, Redis, PostgreSQL) with Docker Compose:

1. **Create `.env`** from the example and set at least `SECRET_KEY` and `POSTGRES_PASSWORD`:

   ```bash
   cp .env.example .env
   # Edit .env: SECRET_KEY=..., POSTGRES_PASSWORD=...
   ```

2. **Build and start**:

   ```bash
   docker compose up -d --build
   ```

3. **Create a superuser** (one-off):

   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

4. **Open the app**: API at [http://localhost:8000](http://localhost:8000), admin at [http://localhost:8000/admin/](http://localhost:8000/admin/), health at [http://localhost:8000/health/](http://localhost:8000/health/).

Override the web port with `WEB_PORT`, e.g. `WEB_PORT=9000 docker compose up -d`.

**Note:** Create `.env` from `.env.example` before running `docker compose`; the Compose file references `env_file: .env`.

---

## Frontend

A React + Vite app in the `frontend/` folder provides a login page and dashboard that use the JWT API.

1. **Install and run** (backend must be running, e.g. Docker on port 8000):
   ```bash
   cd frontend && npm install && npm run dev
   ```
2. Open [http://localhost:5173](http://localhost:5173). Sign in at `/login` with a user created via `createsuperuser` (use **email** as the username).
3. See `frontend/README.md` for details, test credentials, and build instructions.

---

## Docker & robustness improvements

- **Multi-stage Dockerfile**: Builder and runtime stages for smaller images; non-root user.
- **PostgreSQL + Redis**: DB and broker in containers with healthchecks; migration and static collection in entrypoint.
- **Env-driven config**: `DATABASE_URL`, `CELERY_*`, `ALLOWED_HOSTS`, optional Twilio; SQLite fallback when `DATABASE_URL` is unset.
- **Health endpoint**: `GET /health/` for load balancers and container healthchecks.
- **Celery Beat schedule**: Promotional notifications (09:00 UTC) and service reminders (10:00 UTC) via `beat_schedule`.
- **JWT blacklist**: `token_blacklist` app enabled for refresh rotation.
- **Gunicorn**: `--worker-tmp-dir /dev/shm`; explicit workers and logging.

---

## Celery and Redis

This app uses Celery for handling background tasks like sending notifications and adjusting inventory. Redis acts as the message broker. Make sure Redis is running and Celery workers are active to execute these background tasks.

---

## API Endpoints

### Authentication

| Method | Endpoint           | Description                          |
|--------|---------------------|--------------------------------------|
| POST   | `/auth/login/`      | Obtain access and refresh tokens     |
| POST   | `/auth/refresh/`    | Refresh the access token             |

### Service Requests

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| POST   | `/service-requests/`            | Create a new service request         |
| GET    | `/service-requests/{id}/`       | Retrieve a service request by ID     |
| POST   | `/service-requests/{id}/assign-mechanic/` | Assign a mechanic to a service request |
| POST   | `/service-requests/{id}/complete/` | Mark a service as completed       |

### Product Usage

| Method | Endpoint                        | Description                                 |
|--------|---------------------------------|---------------------------------------------|
| POST   | `/product-usage/`               | Add product usage for a service request     |
| GET    | `/product-usage/{service_request_id}/` | List product usage entries for a service |

### Invoices

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| GET    | `/invoices/{id}/`               | Retrieve an invoice by ID            |
| PATCH  | `/invoices/{id}/`               | Update the payment status of an invoice |

### Notifications

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| POST   | `/notifications/promotions/trigger/` | Trigger promotional notifications |

---

## Testing

### Automated CI (GitHub Actions)

On push/PR to `master` or `main`, the CI workflow runs:

- **Backend**: Django unit tests (`python manage.py test`)
- **Frontend**: Vitest unit tests (`npm run test:run`) and build
- **E2E**: Playwright tests (login, dashboard, service requests)

See `.github/workflows/ci.yml` for the full pipeline. Uses SQLite for tests (no Postgres/Redis in CI).

### Local testing

**Backend (Docker):** `docker compose exec web python manage.py test`

**Frontend:** `cd frontend && npm run test:run`

**E2E:** See [frontend/README.md](frontend/README.md#e2e-setup).

### Manual API testing

- Use **Postman** to test endpoints for creating and completing service requests, managing product usage, and generating invoices.
- **Celery Testing**: To verify Celery tasks, check Redis queues and confirm delivery of notifications through Twilio logs.

### Sample Workflow Test in Postman

1. **Create Service Request**: `POST /service-requests/`
2. **Assign Mechanic**: `POST /service-requests/{id}/assign-mechanic/`
3. **Add Product Usage**: `POST /product-usage/`
4. **Mark as Completed**: `POST /service-requests/{id}/complete/`
5. **Check Inventory**: `GET /inventory/`
6. **Verify Invoice**: `GET /invoices/{id}/`

---

## Future Enhancements

- **Role-Based Access Control**: Define more granular permissions for different user roles.
- **Comprehensive Admin Dashboard**: Integrate a dashboard to visualize workshop statistics, active requests, inventory levels, etc.
- **Enhanced Notification Features**: Add more notification channels or integrate with email providers for additional flexibility.
- **Reporting and Analytics**: Provide detailed reports on revenue, service types, and product usage trends.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Contact

For any questions or issues, please reach out to **[juelzghg@gmail.com]** or open an issue in this repository.
