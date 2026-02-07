# Workshop Management — Frontend

React + Vite frontend for the Vehicle Workshop Management app. JWT auth, dashboard, service requests (list / create / detail), and list views for customers, vehicles, mechanics, inventory, and invoices.

## Stack

- **React 18** + **Vite 5**
- **React Router 6**
- JWT auth via `/auth/login/` and `/auth/refresh/`

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Runs at [http://localhost:5173](http://localhost:5173). `/auth` and `/api` are proxied to the backend at `http://127.0.0.1:8000`.

**Requires:** Backend running (e.g. `docker compose up` or `python manage.py runserver` on port 8000).

## Test login

1. Create a user:  
   `docker compose exec web python manage.py createsuperuser`  
   (use **email** as the username).

2. Or use the test user (if created):  
   - **Email:** `admin@workshop.test`  
   - **Password:** `TestPass123!`

3. Open [http://localhost:5173/login](http://localhost:5173/login), sign in → redirect to Dashboard.

## App flow

- **Dashboard:** Counts by status (Pending / In progress / Completed), recent service requests, **New service request** CTA.
- **Service requests:** List with status filter, row click → detail. **New** → create form.
- **Create service request:** Pick customer → vehicle (filtered by customer) → site → description → **Create** → redirect to detail.
- **Service request detail:** View info, assign mechanic (dropdown + Save), add parts (product + qty → Add), **Mark complete** (adjusts inventory, creates invoice).
- **Customers, Vehicles, Mechanics, Inventory, Invoices:** List-only tables (read-only for now).

## Tests

- **Unit / integration:** `npm test` (watch) or `npm run test:run`
- **E2E (Playwright):** `npm run test:e2e` or `npm run test:e2e:ui`

### E2E setup

**With Docker**

1. Backend running: `docker compose up` (port 8000)
2. Create E2E test user: `docker compose exec web python manage.py create_e2e_user`

**Without Docker (local backend)**

1. From project root: activate venv, then `python manage.py migrate` and `python manage.py runserver` (port 8000)
2. Create E2E test user: `python manage.py create_e2e_user`
3. Redis: start `redis-server` if Celery is required; for basic E2E (login, list pages), the API runs without Celery

**Run tests**

1. Install Playwright browsers (one-off): `npx playwright install chromium`
2. Run: `cd frontend && npm run test:e2e`

The Playwright config starts the frontend dev server automatically. Optional env vars: `PW_TEST_EMAIL`, `PW_TEST_PASSWORD` (defaults: admin@test.com / testpass123).

## Build

```bash
npm run build
```

Output in `dist/`. Serve with any static host or via Django.

## Structure

```
frontend/
├── public/
├── src/
│   ├── api/           # client.js, services.js
│   ├── components/    # Layout (sidebar + main)
│   ├── context/       # AuthContext
│   ├── pages/         # Dashboard, ServiceRequests, Detail, Create, Customers, ...
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## Seeding data

To create service requests you need customers, vehicles, and sites. Add them via Django admin ([http://localhost:8000/admin/](http://localhost:8000/admin/)) or create API helpers later. Products and inventory are required for “add parts” on a service request.
