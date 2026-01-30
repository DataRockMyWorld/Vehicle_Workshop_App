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
