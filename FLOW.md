# Vehicle Workshop App — Flow & Overview

This document describes what the app does, how its pieces fit together, and the main user and system flows.

---

## 1. What the app does

The **Vehicle Workshop App** is a management system for workshops that service vehicles and sell spare parts. Staff can:

- Manage **customers**, **vehicles**, **mechanics**, and **sites** (workshop locations).
- Create and track **service requests** (jobs) for a customer’s vehicle at a site.
- Record **parts used** per job (products and quantities).
- **Complete** jobs: update status, deduct **inventory**, generate **invoices**, and send **notifications** (mechanic assigned, invoice created, car ready for pickup).
- Manage **products** (catalog) and **inventory** (stock per product per site).
- View **invoices** and service history.

The system supports **multi-site** workshops, **JWT**-authenticated access, and optional **SMS** (Twilio). In development, notifications are logged to the console instead of sending real SMS.

**Permissions:** Superusers (or users with `site=null`) see all sites and data. Site-scoped users (`site` set) see only their site's vehicles, mechanics, service requests, inventory, and invoices. Completed service requests are locked from edits and deletes. See `PERMISSIONS_DESIGN.md` for full details.

---

## 2. Architecture at a glance

| Layer | Tech |
|-------|------|
| **Backend** | Django, Django REST Framework (DRF) |
| **API** | REST, JSON, `/api/v1/` prefix |
| **Auth** | JWT (access + refresh), `djangorestframework-simplejwt` |
| **Frontend** | React, Vite, React Router |
| **Task queue** | Celery, Redis (broker + results) |
| **DB** | PostgreSQL (Docker) or SQLite (local fallback) |
| **Deployment** | Docker Compose: `web`, `celery`, `celery-beat`, `db`, `redis` |

- **Web**: Gunicorn + Whitenoise. Serves API and static files, runs migrations on startup.
- **Celery worker**: Runs async tasks (notifications, etc.).
- **Celery Beat**: Schedules periodic tasks (service reminders, promotional SMS).

---

## 3. Domain model & relationships

```
Site (workshop location)
  ├── mechanics (FK)
  ├── vehicles (FK)
  ├── service_requests (FK)
  └── inventory_records (product + site → stock)

Customer
  └── vehicles (FK)

Vehicle (customer, site)
  └── service_requests (implicit via vehicle)

ServiceRequest (customer, vehicle, site, optional assigned_mechanic)
  └── ProductUsage (product, quantity_used) → Product

Product (catalog: name, SKU, category, unit_price, cost_price, unit_of_measure, …)
  └── inventory_records (per site)

Inventory (product, site): quantity_on_hand, quantity_reserved, reorder_level, bin_location, …
  └── InventoryTransaction (audit: IN/OUT/adjust, etc.)

Invoice (service_request, total_cost, paid)
```

- **Mechanics** belong to a **site**.
- **Vehicles** belong to a **customer** and a **site**.
- **Service requests** link customer, vehicle, site, and optionally a mechanic. Parts used are stored as **ProductUsage** (product + quantity).
- **Inventory** is per **product** and **site**. **InventoryTransaction** records movements (e.g. stock-out when a job is completed).
- **Invoices** are created when a service request is **completed**; `total_cost` is derived from product usage (unit_price × quantity_used).

---

## 4. Core user flow: from login to job completion

### 4.1 Authentication

1. User opens the app → **Login** page.
2. Submits username + password → `POST /auth/login/` → receives **access** and **refresh** tokens.
3. Frontend stores tokens (e.g. `localStorage`), sends `Authorization: Bearer <access>` on API calls.
4. On 401, frontend tries `POST /auth/refresh/` with refresh token; on success, retries the failed request. If refresh fails, user is logged out and redirected to login.

All main app routes (except `/login`) are protected; unauthenticated users are redirected to login.

### 4.2 Master data (optional but typical order)

Users typically ensure the following exist before creating jobs:

- **Sites**: workshop locations.
- **Customers**: name, phone, email.
- **Vehicles**: make, model, year, license plate, customer, site.
- **Mechanics**: name, phone, site.
- **Products**: catalog (name, SKU, category, unit_price, etc.).
- **Inventory**: for each product used in jobs, add **inventory** at the **site** of the job (quantity on hand, reorder level, etc.).

The frontend provides list + create (and often edit) flows for each of these under **Dashboard**, **Customers**, **Vehicles**, **Mechanics**, **Sites**, **Products**, **Inventory**.

### 4.3 Service request lifecycle

1. **Create**
   - **Dashboard** → “New service request” or **Service requests** → “Add” / “New”.
   - Form: customer, vehicle, site, description, status (e.g. Pending).
   - `POST /api/v1/service_request/` creates the request.

2. **Add parts**
   - Open the **service request detail** page.
   - Add **product usage**: choose product (from catalog), quantity. Frontend may restrict to products with **inventory** at the request’s **site** and sufficient **available** quantity (on hand − reserved).
   - `POST /api/v1/product-usage/` with `service_request`, `product`, `quantity_used`.
   - Parts used are shown in the detail view (e.g. table with product, qty, unit price, line total).

3. **Assign mechanic** (optional)
   - On the same detail page, set **assigned mechanic** (dropdown of mechanics for the site).
   - `PATCH /api/v1/service_request/<id>/` with `assigned_mechanic`.
   - **Signal** `notify_mechanic_on_assignment` fires on update → Celery task **`notify_mechanic_assignment`** queues an SMS to the mechanic (or logs to console in dev).

4. **Complete**
   - User clicks **“Mark complete”** (or equivalent).
   - `POST /api/v1/service_request/<id>/complete/` is called.
   - **`complete_service`** runs **synchronously** in the web process:
     - Sets status → **Completed**.
     - **Adjusts inventory**: for each product usage, deducts `quantity_used` from **Inventory** (product + site of the job), creates **InventoryTransaction** (OUT). Uses `select_for_update` for safe concurrency. If no inventory or insufficient stock, raises `ValueError` → 400 to client, no DB changes.
     - **Creates invoice**: `total_cost` = sum over product usages of `unit_price × quantity_used`; `Invoice` is created and linked to the service request.
     - **Queues** `notify_customer_of_invoice` (Celery) → SMS to customer with total and “proceed to payment.”
     - **Sends** “car ready for pickup” SMS to customer (inline, same process).
   - All of the above runs inside a **transaction**; inventory adjust or invoice create failures roll back. Notification failures are caught and logged but do **not** roll back completion.

5. **After completion**
   - Service request stays **Completed**; no further parts can be added.
   - **Invoices** list (and detail, if implemented) shows the new invoice; user can track **paid** status.
   - **Inventory** reflects reduced stock; **InventoryTransaction** history provides an audit trail.

---

## 5. Notifications

| Trigger | Recipient | Message | Delivery |
|--------|-----------|---------|----------|
| Mechanic **assigned** to a service request | Mechanic | “You have been assigned…” (customer, vehicle, description) | Celery task `notify_mechanic_assignment` (queued by signal on SR update) |
| **Invoice generated** (on complete) | Customer | “Your service is complete. Total cost $X. Please proceed to payment.” | Celery task `notify_customer_of_invoice` |
| **Job completed** | Customer (vehicle owner) | “Your vehicle X is ready for pickup. Thank you.” | Inline in `complete_service` |
| **Service reminder** (scheduled) | Customers with vehicles due for service | “Your vehicle is due for servicing…” | Celery Beat → `send_service_reminder` (uses `vehicle.last_serviced`; example: 180 days) |
| **Promotional** (scheduled) | All customers | Active promotions (title + description) | Celery Beat → `send_promotional_notifications` (active promotions where today ∈ `start_date`…`end_date`) |

All messaging goes through **`core.messaging.send_sms`**:

- **Development** (default): `USE_TWILIO_SMS` is false → messages are **logged to the console** (web or Celery worker stdout). No Twilio needed.
- **Production**: Set `USE_TWILIO_SMS=True` and Twilio credentials → **Twilio** sends real SMS.

Phone numbers are stored as **`CharField`** (e.g. E.164); same format is used for logging and Twilio.

---

## 6. Frontend structure

- **Router**: React Router. `/login` is public; everything else lives under a layout that requires auth.
- **Layout**: Sidebar navigation (Dashboard, Service requests, Customers, Vehicles, Mechanics, Sites, Products, Inventory, Invoices), user info, sign out.
- **Pages**:
  - **Login**: username/password → JWT, then redirect to Dashboard or previously attempted URL.
  - **Dashboard**: Service request stats (Pending / In progress / Completed), recent requests, link to create new.
  - **Service requests**: List, create (`/service-requests/new`), detail (`/service-requests/:id`). Detail: add parts, assign mechanic, mark complete, view invoice if present.
  - **Customers, Vehicles, Mechanics, Sites, Products, Inventory, Invoices**: List views plus create (and often edit) where applicable.
- **API client**: `api(path, options)` → `fetch` to `/api/v1/...` or `/auth/...`, with JWT and refresh-on-401 logic. Helpers like `toList`, `apiErrorMsg` normalize list responses and errors.

---

## 7. API overview

- **Auth**: `POST /auth/login/`, `POST /auth/refresh/`.
- **Health**: `GET /health/` (no auth).
- **Core CRUD** (under `/api/v1/`):  
  `customers/`, `vehicle/`, `mechanic/`, `sites/`, `products/`, `inventory/`, `invoices/` (list/create/detail/update/delete as per routes).
- **Service requests**:  
  `service_request/` (list, create), `service_request/<id>/` (get, update, delete), `service_request/<id>/complete/` (POST).
- **Product usage**:  
  `product-usage/` (POST create), `product-usage/<service_request_id>/` (GET list).

All API (except health/login/refresh) expect **JWT** in `Authorization: Bearer <access>`. Schema: `GET /api/schema/`, Swagger UI: `GET /api/schema/docs/`.

---

## 8. Docker services & running the app

- **`db`**: PostgreSQL.
- **`redis`**: Broker and backend for Celery.
- **`web`**: Django app (Gunicorn). Entrypoint runs migrations, then starts the server.
- **`celery`**: Celery worker.
- **`celery-beat`**: Celery Beat (scheduled tasks).

Typically:

1. Copy `.env.example` → `.env`, set `SECRET_KEY`, `ALLOWED_HOSTS`, and optionally DB/Redis/Twilio.
2. `docker compose up --build` (or `-d` for background).
3. Create a superuser if needed:  
   `docker compose run --rm web python manage.py createsuperuser`
4. Run frontend dev server (e.g. `npm run dev` in `frontend/`) with proxy to the API, or build and serve frontend assets via the same backend.

---

## 9. Summary flow diagram (simplified)

```
Login → Dashboard
         ↓
   Create service request (customer, vehicle, site, description)
         ↓
   Add parts (product + qty) ──→ ProductUsage
         ↓
   Assign mechanic (optional) ──→ Signal → notify_mechanic_assignment (SMS)
         ↓
   Mark complete ──→ complete_service
                     ├── Status = Completed
                     ├── Adjust inventory (deduct, InventoryTransaction OUT)
                     ├── Create invoice (total from product usage)
                     ├── notify_customer_of_invoice (SMS)
                     └── “Car ready” SMS to customer
```

---

This flow document should give a clear picture of what the app does, how data and notifications move, and where to look in the codebase for each part.
