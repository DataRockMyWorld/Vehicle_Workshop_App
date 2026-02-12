# API Reference

Interactive API documentation is available when the backend is running:

- **Swagger UI** (interactive): `http://localhost:8000/api/schema/docs/`
- **OpenAPI schema** (JSON): `http://localhost:8000/api/schema/`

In production, replace `localhost:8000` with your deployed backend URL (e.g. `https://your-app.railway.app`).

## Authentication

All API endpoints (except `/auth/login/`) require JWT authentication.

1. **Login**: `POST /auth/login/` with JSON body:
   ```json
   { "email": "user@example.com", "password": "your-password" }
   ```
   Returns: `{ "access": "<jwt-token>", "refresh": "<refresh-token>" }`

2. **Use the token**: Include in requests:
   ```
   Authorization: Bearer <access-token>
   ```

3. **Refresh token**: `POST /auth/refresh/` with JSON body:
   ```json
   { "refresh": "<refresh-token>" }
   ```

4. **Logout**: `POST /auth/logout/` with JSON body:
   ```json
   { "refresh": "<refresh-token>" }
   ```

## Base URL

- Local: `http://localhost:8000`
- All API endpoints: `/api/v1/...`
- Auth endpoints: `/auth/...`

## Endpoints Overview

| Path | Description |
|------|-------------|
| `/api/v1/me/` | Current user info (can_write, can_see_all_sites, site_id) |
| `/api/v1/customers/` | Customer CRUD, walk-in customer |
| `/api/v1/vehicle/` | Vehicle CRUD |
| `/api/v1/mechanic/` | Mechanic CRUD |
| `/api/v1/sites/` | Site CRUD |
| `/api/v1/products/` | Product CRUD, search, import |
| `/api/v1/inventory/` | Inventory CRUD, low-stock |
| `/api/v1/service_request/` | Service requests CRUD, complete |
| `/api/v1/product-usage/` | Product usage on service requests |
| `/api/v1/invoices/` | Invoice CRUD, PDF download |
| `/api/v1/promotions/` | Promotions CRUD, SMS blast |
| `/api/v1/dashboard/` | CEO dashboard, reports, export |
| `/api/v1/search/` | Global search |
| `/api/v1/audit/` | Audit trail |
| `/api/v1/service-categories/` | Service categories and types |

## Pagination

List endpoints return paginated results:

```json
{
  "count": 100,
  "next": "http://.../api/v1/customers/?page=2",
  "previous": null,
  "results": [...]
}
```

Query params: `?page=2`, `?page_size=25`

## Swagger UI

1. Open `https://your-backend/api/schema/docs/`
2. Click **Authorize**
3. For JWT: use `Bearer <your-access-token>` or paste just the token (Swagger adds Bearer)
4. Click **Authorize** then **Close**
5. Try any endpoint with **Try it out**
