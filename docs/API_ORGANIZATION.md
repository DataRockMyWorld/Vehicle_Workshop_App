# API Organization & Conventions

This document describes the current API structure and recommends best practices for future development.

## Current Structure

All REST endpoints live under `/api/v1/`. Auth endpoints are at `/auth/`.

### Base URLs

| Path Prefix | App | Endpoints |
|-------------|-----|-----------|
| `/api/v1/` | (core) | Aggregates all app URLs |
| `/api/v1/appointments/` | Appointments | List, detail, availability |
| `/api/v1/dashboard/` | Dashboard | Metrics, site, activities, reports, export |
| `/api/v1/search/` | Dashboard | Global search |
| `/api/v1/audit/` | Audit | Audit logs |
| `/api/v1/service-categories/` | ServiceRequests | Categories with nested types |
| `/auth/` | accounts | login, refresh, logout |
| `/api/v1/me/` | accounts | Current user |
| `/api/v1/customers/` | Customers | CRUD, walkin |
| `/api/v1/inventory/` | Inventories | CRUD, low-stock |
| `/api/v1/mechanic/` | Mechanics | CRUD |
| `/api/v1/service_request/` | ServiceRequests | CRUD, complete, product-usage |
| `/api/v1/invoices/` | Invoices | CRUD, PDF |
| `/api/v1/products/` | Products | CRUD, search, import |
| `/api/v1/promotions/active/` | Promotions | Active promotions list |
| `/api/v1/sites/` | Site | CRUD |

### Inconsistencies (Current)

1. **Singular vs plural**: `mechanic/` and `vehicle/` use singular; `customers/`, `invoices/` use plural.
2. **Naming style**: `service_request/` uses snake_case; others use kebab-case or simple nouns.
3. **Nested resources**: `product-usage/` is top-level; REST convention might nest under `/service-requests/:id/product-usage/`.

## Recommended REST Conventions

For **new** or **refactored** endpoints, prefer:

1. **Plural nouns** for collections: `/customers/`, `/vehicles/`, `/mechanics/`, `/invoices/`
2. **Kebab-case** for multi-word resources: `/service-requests/`, `/product-usage/`, `/low-stock/`
3. **Nested resources** where ownership is clear:
   - `/service-requests/:id/product-usage/` (parts used in a service request)
   - `/service-requests/:id/complete/` (action on a single request)
4. **Consistent trailing slash**: All paths use trailing slashes (Django default).
5. **Version prefix**: Keep `/api/v1/` for future versioning.

## API Documentation

- **OpenAPI Schema**: `GET /api/schema/` (JSON)
- **Swagger UI**: `GET /api/schema/docs/` (interactive docs)

Use Swagger UI to explore endpoints, try requests, and inspect request/response schemas. JWT can be passed via the "Authorize" button (Bearer token).

## Query Optimization

List and detail views use `select_related()` and `prefetch_related()` to avoid N+1 queries:

| Resource | Optimizations |
|----------|---------------|
| ServiceRequest | `select_related("customer", "vehicle", "site", "assigned_mechanic", "service_type", "service_type__category")` |
| Invoice | `select_related("service_request", "service_request__customer", "service_request__vehicle", "service_request__site")` |
| Inventory | `select_related("product", "site")` |
| Vehicle | `select_related("customer", "site")` |
| Mechanic | `select_related("site")` |
| Appointment | `select_related("customer", "vehicle", "site", "mechanic")` |
| ProductUsage | `select_related("service_request", "product")` |
| ServiceCategory | `prefetch_related("service_types")` |

## Pagination

All list endpoints use page-based pagination (25 items per page). Response format:

```json
{
  "count": 123,
  "next": "http://.../api/v1/customers/?page=2",
  "previous": null,
  "results": [...]
}
```

Query params: `?page=2` for page 2. The frontend `toList()` helper extracts `results` from both raw arrays and paginated responses.

## Future Improvements

1. **URL consistency**: Gradually migrate `mechanic/` → `mechanics/`, `vehicle/` → `vehicles/`, `service_request/` → `service-requests/` with proper deprecation and frontend updates.
2. **Filtering**: Standardize query params (e.g. `?status=Pending&site_id=1`) across list endpoints.
3. **Nested writes**: Support creating product usage via `POST /service-requests/:id/product-usage/`.
