
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
- Twilio account for SMS/WhatsApp notifications

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

Create a `.env` file in the root directory to store sensitive configuration data. The following variables should be set:

```
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=postgres://user:password@localhost:5432/vehicle_workshop

# Redis configuration for Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# JWT settings
SIMPLE_JWT_ACCESS_TOKEN_LIFETIME=30m
SIMPLE_JWT_REFRESH_TOKEN_LIFETIME=7d

# Twilio credentials for notifications
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

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
   celery -A workshop_management worker -l info
   celery -A workshop_management beat -l info
   ```

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
