# Permissions & Interactivity Design

This document outlines the permission model, site scoping, and edit rules for the Vehicle Workshop App, aligned with industry best practices.

**Implementation status:** Implemented. Assign `site` to users in Django Admin; superusers and users with `site=null` see all sites; site users see only their site's data.

---

## 1. Current State (Pre-Implementation)

| Area | Current behaviour | Gap |
|------|-------------------|-----|
| **User model** | `CustomUser` has `email`, `location`; no `site` FK | No way to scope users to a site |
| **Permissions** | Most views use `IsAuthenticated` only | All authenticated users see and edit everything |
| **Data scoping** | No filtering by site | Site users would see data from all sites |
| **Products** | `IsSuperUserOrReadOnly` — only superuser can write | Good; catalog is central |
| **Inventory** | `restricted_edit` blocks non-superuser from some operations | Partially implemented |
| **Service requests** | No status-based edit restrictions | Completed jobs can still be edited (risky) |

---

## 2. Roles & Access

| Role | Who | Access |
|------|-----|--------|
| **Superuser** | `is_superuser=True`, `site=null` | All sites, all data, full CRUD, overrides |
| **Site user** | `site=<Site>` set | Only that site’s data; create/edit within rules below |

**User model change:** Add nullable `site` FK to `CustomUser`.  
- `site=None`: HQ / superuser — sees all sites, monitors all activity  
- `site=<Site>`: Scoped to that site

---

## 3. Data Scoping (What Each Role Sees)

| Entity | Superuser | Site user |
|--------|-----------|-----------|
| **Sites** | All | All (read); edit only own site |
| **Customers** | All | All (shared across sites) |
| **Vehicles** | All | Only vehicles at their site |
| **Mechanics** | All | Only mechanics at their site |
| **Service requests** | All | Only at their site |
| **Products** | All (catalog) | All (read-only; catalog is central) |
| **Inventory** | All | Only at their site |
| **Invoices** | All | Only for SRs at their site |
| **Product usage** | All | Via SR (same as SR scoping) |

**Rationale:** Customers and products are shared. Site-specific entities (vehicles, mechanics, service requests, inventory) are filtered by `site` for site users.

---

## 4. Edit Rules (Who Can Edit What)

### 4.1 Service request

| Status | Editable? | Who | What |
|--------|-----------|-----|------|
| **Pending** | Yes | Site user (own site), Superuser | Description, status, assigned mechanic, site (superuser only) |
| **In progress** | Yes | Same | Same — site manager can fix mistakes |
| **Completed** | **No** | — | Locked to protect history, invoices, inventory; corrections via credit/adjustment (future) or superuser override |

**Best practice:** Lock completed records; avoid editing after financial/inventory impact.

### 4.2 Product usage (parts on a job)

| When | Add | Edit qty | Remove |
|------|-----|----------|--------|
| SR not completed | Yes | Yes | Yes |
| SR completed | No | No | No |

Same rules as service request completion.

### 4.3 Invoice

| Field | Editable? | Who |
|-------|-----------|-----|
| `total_cost` | No | — (reflects product usage) |
| `paid` | Yes | Site user (own site), Superuser |

**Best practice:** Only the `paid` flag is editable; financial data is read-only.

### 4.4 Customer

| Action | Who |
|--------|-----|
| Create, read, update, delete | All authenticated (customers are shared) |

### 4.5 Vehicle

| Action | Who | Restriction |
|--------|-----|-------------|
| Create | Site user, Superuser | Site user can only create for their site |
| Update | Same | Site user: only vehicles at their site; cannot move vehicle to another site |
| Delete | Same | Same scoping |

### 4.6 Mechanic

| Action | Who | Restriction |
|--------|-----|-------------|
| Create | Site user, Superuser | Site user can only create for their site |
| Update | Same | Site user: only mechanics at their site |
| Delete | Same | Same scoping |

### 4.7 Site

| Action | Who |
|--------|-----|
| Create | Superuser only |
| Read | All authenticated |
| Update | Superuser; site user can update **only their own** site |
| Delete | Superuser only |

### 4.8 Product (catalog)

| Action | Who |
|--------|-----|
| Create, update, delete | Superuser only |
| Read | All authenticated |

(Keep existing `IsSuperUserOrReadOnly`.)

### 4.9 Inventory

| Action | Who | Restriction |
|--------|-----|-------------|
| Create | Site user, Superuser | Site user: only for their site |
| Update | Same | `restricted_edit=True`: superuser only; `restricted_edit=False`: site user for own site |
| Delete | Same | Same as update |

---

## 5. Implementation Summary

1. **User model:** Add `site = models.ForeignKey(Site, null=True, blank=True, on_delete=SET_NULL)`.
2. **Mixin:** Create `SiteScopedQuerysetMixin` (or similar) to filter querysets by `request.user.site` for non-superusers.
3. **Per-view logic:**
   - Apply site filtering to list/get querysets where relevant.
   - Add `get_queryset()` overrides with site filter.
   - Use `perform_create` / `perform_update` to enforce site and status rules.
4. **Status-based locks:** In service request and product usage serializers/views, block create/update/delete when `status == 'Completed'`.
5. **Invoice:** Add a partial-update endpoint or restrict `update` to `paid` only.
6. **Frontend:** 
   - Filter dropdowns by site for site users.
   - Disable/hide edit actions when the user lacks permission or the record is locked.
   - Show a clear message when an edit is not allowed.

---

## 6. Edge Cases & Best Practices

- **Site user with no site:** Treat like superuser for visibility, or deny access until a site is assigned.
- **Reassigning a user’s site:** Admin-only; user’s scope changes immediately.
- **Deleting a site:** Cascade or protect existing data (e.g. SET_NULL on user.site); service requests, vehicles, etc. already have site FK.
- **Audit trail:** Consider logging edits (who, when, what) for service requests and invoices.
- **Soft delete:** Optional for important records instead of hard delete.

---

This design keeps site isolation, supports corrections for in-progress work, and locks completed records to avoid tampering.
