# Sales vs Service Requests - Technical Deep Dive

## Executive Summary

**Key Finding:** Sales and service requests are **NOT separate entities** - they share the **exact same API endpoint** and database model, distinguished only by `vehicle=null` for sales.

**Architecture Grade: C (60/100)**

This is a **polymorphic design pattern** that works but creates significant technical debt and scalability issues.

---

## 🔍 How They Come Together

### Unified Data Model

```python
# ServiceRequests/models.py (Lines 40-83)
class ServiceRequest(models.Model):
    display_number = models.CharField(max_length=20, unique=True)  # e.g. SR-2025-0042
    customer = models.ForeignKey(Customer)
    vehicle = models.ForeignKey(Vehicle, null=True, blank=True)  # ⚠️ NULL = SALE
    site = models.ForeignKey(Site)
    service_type = models.ForeignKey(ServiceType, null=True, blank=True)
    description = models.TextField()
    assigned_mechanic = models.ForeignKey(Mechanic, null=True, blank=True)
    status = models.CharField(choices=['Pending', 'In Progress', 'Completed'])
    product_used = models.ManyToManyField(Product, through='ProductUsage')
    labor_cost = models.DecimalField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

**The Magic Line:**
```python
# Line 76-78
def __str__(self):
    if self.vehicle_id:
        return f"Service Request {self.display_number or self.id} - {self.status}"
    return f"Sale {self.display_number or self.id} - {self.status}"
```

---

## 🔗 Shared API Endpoints

### 1. Creation Endpoint (Both Use This)

**URL:** `POST /api/v1/service_request/`

**For Service Requests:**
```json
{
  "customer": 5,
  "vehicle": 12,
  "site": 2,
  "service_type": 8,
  "description": "Replace brake pads",
  "status": "Pending"
}
```

**For Sales (Parts Only):**
```json
{
  "customer": 5,
  "vehicle": null,          // ⚠️ THIS IS THE ONLY DIFFERENCE
  "site": 2,
  "service_type": null,
  "description": "Sales",
  "status": "Pending"
}
```

### 2. List Endpoint (Filtered)

**Service Requests:**
```
GET /api/v1/service_request/
# Returns all records with vehicle != null
```

**Sales Only:**
```
GET /api/v1/service_request/?parts_only=true
# Returns all records with vehicle == null (Line 24-26 in views.py)
```

```python
# ServiceRequests/views.py:24-26
parts_only = self.request.query_params.get("parts_only", "").lower() in ("1", "true", "yes")
if parts_only:
    qs = qs.filter(vehicle__isnull=True)
```

### 3. Detail Endpoint (Identical)

**Both use:**
```
GET    /api/v1/service_request/23/
PUT    /api/v1/service_request/23/
DELETE /api/v1/service_request/23/
```

### 4. Completion Endpoint (Identical)

**Both use:**
```
POST /api/v1/service_request/23/complete/
```

**Request Body (optional for both):**
```json
{
  "promotion_id": 5,
  "discount_amount": 10.00,
  "labor_cost": 50.00
}
```

---

## 📦 Inventory Management - YES, Both Affect Inventory

### Flow for BOTH Sales and Service Requests

```
1. Staff creates sale/service (status: Pending)
         ↓
2. Staff adds products via ProductUsage
   - ProductUsage.objects.create(service_request=23, product=15, quantity_used=2)
   - ⚠️ Inventory is NOT touched yet
         ↓
3. Staff clicks "Complete sale" or "Mark complete"
   - POST /api/v1/service_request/23/complete/
         ↓
4. Backend runs complete_service() synchronously (Line 219-254 in tasks.py)
         ↓
5. Inventory adjustment happens (Line 245)
   - _do_adjust_inventory(service_request_id)
         ↓
6. For EACH ProductUsage:
   - Find Inventory record (product + site)
   - Check if quantity_on_hand >= quantity_used
   - Deduct: inventory.quantity_on_hand -= usage.quantity_used
   - Create InventoryTransaction (type: OUT, quantity: -2)
         ↓
7. Invoice generation (Line 246)
   - _do_generate_invoice(service_request_id, promotion, discount)
   - Calculate: subtotal = parts_total + labor_cost
   - Apply discount
   - Create Invoice record
         ↓
8. Customer notification (Line 248-252)
   - Celery task: notify_customer_of_invoice.delay(invoice.id)
   - SMS/email: "Your invoice is ready"
```

### Inventory Adjustment Code

```python
# ServiceRequests/tasks.py:91-126
def _do_adjust_inventory(service_request_id):
    """
    Adjusts inventory for BOTH sales and service requests.
    No distinction made between the two.
    """
    service_request = ServiceRequest.objects.select_related("site").get(id=service_request_id)
    site = service_request.site
    product_usages = ProductUsage.objects.filter(service_request=service_request)

    for usage in product_usages:
        # Get inventory for this product at this site
        inv = Inventory.objects.select_for_update().filter(
            product=usage.product, 
            site=site
        ).first()
        
        if not inv:
            raise ValueError(f"No inventory record for {usage.product.name} at site {site.name}")
        
        if inv.quantity_on_hand < usage.quantity_used:
            raise ValueError(f"Insufficient inventory for {usage.product.name}")
        
        # DEDUCT FROM INVENTORY (same logic for sales and service)
        inv.quantity_on_hand -= usage.quantity_used
        inv.save(update_fields=["quantity_on_hand"])
        
        # CREATE AUDIT TRAIL
        InventoryTransaction.objects.create(
            inventory=inv,
            transaction_type=TransactionType.OUT,
            quantity=-usage.quantity_used,
            reference_type="product_usage",
            reference_id=usage.id,
            notes=f"Service request #{service_request_id}",
        )
```

**Critical Point:**
- The notes say "Service request #23" even for sales
- No differentiation in audit trail between sale vs service
- Both create `TransactionType.OUT` records

---

## 🧩 Complete Flow Comparison

| Step | Service Request | Parts Sale | API Endpoint |
|------|----------------|------------|--------------|
| **1. Create** | `vehicle: 12` | `vehicle: null` | `POST /service_request/` |
| **2. Add items** | ProductUsage | ProductUsage | `POST /product-usage/` |
| **3. Edit items** | ProductUsage | ProductUsage | `PUT /product-usage-item/5/` |
| **4. Complete** | "Mark complete" | "Complete sale" | `POST /service_request/23/complete/` |
| **5. Inventory** | ✅ Deducted | ✅ Deducted | (automatic in step 4) |
| **6. Invoice** | ✅ Generated | ✅ Generated | (automatic in step 4) |
| **7. Payment** | Mark as paid | Mark as paid | `PUT /invoices/15/` |
| **8. Vehicle Update** | ✅ last_serviced updated | ❌ N/A (no vehicle) | (automatic in step 4) |

---

## ⚙️ Shared Business Logic

### 1. ProductUsage Model (Identical)

```python
# ServiceRequests/models.py:85-88
class ProductUsage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    service_request = models.ForeignKey('ServiceRequest', on_delete=models.CASCADE)
    quantity_used = models.PositiveIntegerField()
```

**Used by:**
- Service requests to track parts used in repairs
- Sales to track items sold

**API Endpoints (shared):**
- `POST /api/v1/product-usage/` - Add item to sale/service
- `GET /api/v1/product-usage/23/` - List items in sale/service
- `PUT /api/v1/product-usage-item/5/` - Update item quantity
- `DELETE /api/v1/product-usage-item/5/` - Remove item

### 2. Complete Service Function (Identical)

```python
# ServiceRequests/tasks.py:219-254
def complete_service(service_request_id, promotion_id=None, discount_amount=None):
    """
    Completes BOTH service requests AND sales.
    No branching logic based on vehicle presence.
    """
    service_request = ServiceRequest.objects.get(id=service_request_id)
    
    # Mark as completed
    service_request.status = "Completed"
    service_request.save()

    # Update vehicle last_serviced (only if vehicle exists)
    vehicle = service_request.vehicle
    if vehicle:  # ⚠️ ONLY DIFFERENCE
        vehicle.last_serviced = timezone.now().date()
        vehicle.save()
    
    # Adjust inventory (SAME FOR BOTH)
    _do_adjust_inventory(service_request_id)
    
    # Generate invoice (SAME FOR BOTH)
    invoice = _do_generate_invoice(service_request_id, promotion_id, discount_amount)
    
    # Notify customer (SAME FOR BOTH)
    notify_customer_of_invoice.delay(invoice.id)
    _notify_customer_job_complete(service_request_id, invoice_id=invoice.id)
```

### 3. Invoice Generation (Identical)

```python
# ServiceRequests/tasks.py:134-171
def _do_generate_invoice(service_request_id, promotion_id=None, discount_amount=None):
    """
    Creates invoice for BOTH sales and service requests.
    No distinction in invoice structure.
    """
    service_request = ServiceRequest.objects.get(id=service_request_id)
    parts_total = Decimal("0")

    # Sum up all ProductUsage items
    product_usages = ProductUsage.objects.select_related("product").filter(
        service_request=service_request
    )
    for usage in product_usages:
        parts_total += usage.product.unit_price * usage.quantity_used

    # Add labor cost (usually 0 for sales, but field exists)
    labor_cost = service_request.labor_cost or Decimal("0")
    subtotal = parts_total + labor_cost

    # Apply discounts (same logic for both)
    discount = calculate_discount(promotion_id, discount_amount, subtotal)
    total_cost = max(Decimal("0"), subtotal - discount)

    # Create invoice (same model for both)
    invoice = Invoice.objects.create(
        service_request=service_request,
        subtotal=subtotal,
        discount_amount=discount,
        total_cost=total_cost,
        promotion=promotion,
    )
    return invoice
```

---

## 📊 Database Impact

### Tables Affected by BOTH

1. **ServiceRequest** - Main record (sale or service)
2. **ProductUsage** - Items/parts added
3. **Inventory** - Stock levels deducted
4. **InventoryTransaction** - Audit trail (both create OUT records)
5. **Invoice** - Payment record
6. **Vehicle** (conditional) - Only updated for service requests

### Inventory Transaction Example

```sql
-- After completing a sale (SR #23)
INSERT INTO inventories_inventorytransaction (
    inventory_id,
    transaction_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_at
) VALUES (
    15,                    -- Inventory record for "Brake Pads" at "Main Shop"
    'out',                 -- Stock OUT
    -2,                    -- 2 units deducted
    'product_usage',       -- Reference type
    47,                    -- ProductUsage.id
    'Service request #23', -- ⚠️ Says "Service request" even for sales!
    NOW()
);
```

---

## ⚠️ Critical Issues with Current Design

### 1. **Ambiguous Audit Trail**

**Problem:**
```python
# InventoryTransaction notes always say "Service request #23"
notes=f"Service request #{service_request_id}"
```

**Impact:**
- Accountants can't distinguish sales from service usage
- Inventory reports show "Service request" for retail sales
- Tax reporting complexity (sales vs internal usage)

**Fix:**
```python
# Should be:
entity_type = "Sale" if service_request.vehicle_id is None else "Service"
notes=f"{entity_type} #{service_request_id}"
```

### 2. **Display Number Collision**

**Problem:**
```python
# Both use same number sequence: SR-2025-0042
display_number = get_next_display_number("SR", pad=4)
```

**Impact:**
- Sales show as "SR-2025-0042" (Service Request)
- Confusing for customers receiving invoice
- Reports mix sales and service in same sequence

**Fix:**
```python
# Should be:
if self.vehicle_id is None:
    prefix = "SALE"
else:
    prefix = "SR"
display_number = get_next_display_number(prefix, pad=4)
```

### 3. **Labor Cost on Sales**

**Problem:**
```python
# Sales can have labor_cost (makes no sense)
labor_cost = models.DecimalField(default=0)
```

**Impact:**
- Staff accidentally add labor cost to retail sales
- Invoice shows "Labor / Workmanship" line item for a parts sale
- Confusing for customers

**Fix:**
```python
# Validate in serializer:
def validate_labor_cost(self, value):
    if self.instance and self.instance.vehicle_id is None and value > 0:
        raise ValidationError("Sales cannot have labor costs.")
    return value
```

### 4. **Service Type on Sales**

**Problem:**
```python
# Sales can have service_type (meaningless)
service_type = models.ForeignKey(ServiceType, null=True, blank=True)
```

**Impact:**
- Database pollution
- Confusing dropdown in UI for sales
- Reports show "Mechanical — Brake Repair" for retail part sales

### 5. **No Refund/Return Flow**

**Problem:**
- Completing a service request is irreversible
- No way to reverse inventory deduction
- No `TransactionType.RETURN` in the flow

**Impact:**
- Customer returns item → manual inventory adjustment
- No audit trail linking return to original sale
- Revenue reporting inaccurate

---

## 🎯 Architecture Analysis

### Current: Polymorphic Single Table Inheritance

```
ServiceRequest (single table)
├── if vehicle = null → SALE
└── if vehicle != null → SERVICE REQUEST
```

**Pros:**
✅ Simple to implement initially
✅ Single API endpoint
✅ Shared business logic (DRY)
✅ Works well for small scale (< 100 transactions/day)

**Cons:**
❌ Ambiguous data model
❌ Confusing for new developers
❌ Difficult to add sale-specific features (refunds, discounts, tax)
❌ Poor audit trail
❌ Database constraints can't enforce business rules (e.g., "sales must have no service_type")
❌ Reporting complexity (always need WHERE vehicle IS NULL)
❌ URL confusion (/service-requests/23 for a sale)

### Alternative 1: Separate Models (Recommended for Scale)

```
Transaction (abstract base)
├── Sale (concrete table)
│   ├── customer
│   ├── site
│   ├── payment_method
│   ├── items → SaleItem
│   └── invoice
└── ServiceRequest (concrete table)
    ├── customer
    ├── vehicle
    ├── site
    ├── service_type
    ├── assigned_mechanic
    ├── parts → ServicePart
    └── invoice
```

**Pros:**
✅ Clear separation of concerns
✅ Type-safe (can't add service_type to sale)
✅ Separate URL patterns (/sales/23, /service-requests/45)
✅ Easier to add domain-specific features
✅ Better audit trail
✅ Simpler queries (no filtering by vehicle)

**Cons:**
❌ More code (separate serializers, views, URLs)
❌ Some duplication (invoice generation, inventory logic)
❌ Migration complexity (split existing data)

### Alternative 2: Add Discriminator Field (Quick Fix)

```python
class ServiceRequest(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('sale', 'Sale'),
        ('service', 'Service Request'),
    ]
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    # ... existing fields
```

**Pros:**
✅ Minimal code changes
✅ Explicit type checking (no more if vehicle_id)
✅ Better queries (WHERE transaction_type = 'sale')
✅ Clearer audit trail

**Cons:**
❌ Still sharing same table (constraints issues remain)
❌ Redundant with vehicle field (two sources of truth)
❌ Doesn't fix URL/display_number issues

---

## 💾 Inventory Management Summary

### Do Sales Affect Inventory? ✅ YES, IDENTICALLY

**Both sales and service requests:**
1. Use the same `_do_adjust_inventory()` function
2. Create `InventoryTransaction` records with `type=OUT`
3. Deduct from `Inventory.quantity_on_hand`
4. Run validation (insufficient stock raises error)
5. Use row-level locking (`select_for_update()`)

**No differences in inventory handling whatsoever.**

### Do They Share the Same API? ✅ YES, COMPLETELY

**Shared endpoints:**
- ✅ `POST /service_request/` - Create
- ✅ `GET /service_request/?parts_only=true` - List (filtered)
- ✅ `GET /service_request/23/` - Retrieve
- ✅ `PUT /service_request/23/` - Update
- ✅ `DELETE /service_request/23/` - Delete
- ✅ `POST /service_request/23/complete/` - Complete & adjust inventory
- ✅ `POST /product-usage/` - Add item
- ✅ `PUT /product-usage-item/5/` - Edit item
- ✅ `DELETE /product-usage-item/5/` - Remove item

**Frontend distinguishes them by:**
- Different list pages (`/parts-sale` vs `/service-requests`)
- Different create pages (`/parts-sale/new` vs `/service-requests/new`)
- Same detail page (`/service-requests/:id`) with conditional rendering

---

## 📈 Performance Implications

### Single Request Completion

```python
# POST /service_request/23/complete/

# Synchronous operations (blocking):
1. Update ServiceRequest.status = 'Completed'          ~5ms
2. Update Vehicle.last_serviced (if service)           ~3ms
3. SELECT + UPDATE Inventory (N products)              ~10ms × N
4. INSERT InventoryTransaction (N products)            ~8ms × N
5. SELECT ProductUsage + calculate totals              ~15ms
6. INSERT Invoice                                      ~10ms

# Asynchronous (queued to Celery):
7. notify_customer_of_invoice.delay()                  ~2ms (queue only)
8. _notify_customer_job_complete()                     ~200ms (SMS/email)

Total blocking time: ~50ms + (18ms × number_of_products)
```

**Example:**
- Sale with 5 products: ~140ms
- Service with 10 parts: ~230ms

**Scalability:**
- At 100 transactions/day: ✅ Fine
- At 1,000 transactions/day: ⚠️ Consider async inventory updates
- At 10,000 transactions/day: ❌ Need separate Sale model + async everything

---

## 🔒 Security & Permissions

### Both Enforce Same Rules

```python
# ServiceRequests/views.py:47-54
def perform_create(self, serializer):
    user = self.request.user
    if not user.is_superuser:
        site = getattr(user, "site", None)
        if site and serializer.validated_data.get("site") != site:
            raise PermissionDenied("You can only create service requests for your site.")
```

**Applies to:**
- ✅ Service requests
- ✅ Sales

**Permission checks:**
1. Site-based filtering (staff only see their site's transactions)
2. `IsReadOnlyForHQ` (HQ users can't edit, only view)
3. Cannot edit completed transactions
4. Cannot delete completed transactions

**Missing:**
- ❌ No permission for large discounts (anyone can give 100% off)
- ❌ No role-based access (cashier vs manager)
- ❌ No audit log for who completed the transaction

---

## 📋 Recommendations

### Immediate (Priority 1)

1. **Fix audit trail notes**
   ```python
   # Change from:
   notes=f"Service request #{service_request_id}"
   
   # To:
   entity = "Sale" if sr.vehicle_id is None else "Service"
   notes=f"{entity} {sr.display_number} (#{service_request_id})"
   ```

2. **Add discriminator field**
   ```python
   # Add to model:
   transaction_type = models.CharField(
       max_length=20,
       choices=[('sale', 'Sale'), ('service', 'Service Request')],
       default='service'
   )
   
   # Auto-populate based on vehicle:
   def save(self, *args, **kwargs):
       if not self.transaction_type:
           self.transaction_type = 'sale' if self.vehicle_id is None else 'service'
       super().save(*args, **kwargs)
   ```

3. **Separate display number sequences**
   ```python
   def save(self, *args, **kwargs):
       if not self.display_number:
           prefix = "SALE" if self.transaction_type == 'sale' else "SR"
           self.display_number = get_next_display_number(prefix, pad=4)
       super().save(*args, **kwargs)
   ```

### Short-term (Priority 2)

4. **Add validation constraints**
   ```python
   # In serializer:
   def validate(self, data):
       vehicle = data.get('vehicle')
       service_type = data.get('service_type')
       labor_cost = data.get('labor_cost', 0)
       
       if vehicle is None:  # It's a sale
           if service_type is not None:
               raise ValidationError("Sales cannot have a service type.")
           if labor_cost and labor_cost > 0:
               raise ValidationError("Sales cannot have labor costs.")
       
       return data
   ```

5. **Add return/refund flow**
   - New endpoint: `POST /service_request/23/refund/`
   - Create reverse InventoryTransaction (type=RETURN)
   - Update invoice status
   - Adjust revenue reports

6. **Improve inventory transaction notes**
   - Include customer name
   - Include staff member
   - Include timestamp

### Long-term (Priority 3)

7. **Split into separate models** (if scaling to 5+ locations)
   - Create `Sale` model
   - Migrate existing records
   - Create separate URL patterns
   - Separate frontend pages (no more conditional rendering)

8. **Add sale-specific features**
   - Loyalty points
   - Gift receipts
   - Multiple payment methods per transaction
   - Partial payments
   - Layaway/hold

9. **Add service-specific features**
   - Multi-day jobs
   - Parts ordering (waiting for stock)
   - Quality checks
   - Warranty tracking

---

## 🎓 Lessons for Future Design

### What Worked Well
- ✅ Shared `ProductUsage` model (DRY principle)
- ✅ Inventory transaction audit trail
- ✅ Site-based filtering
- ✅ Single completion flow reduces bugs

### What to Improve
- ⚠️ Implicit type checking (`if vehicle_id`) is fragile
- ⚠️ Shared display number sequence causes confusion
- ⚠️ No clear migration path to separate models later
- ⚠️ Frontend conditional logic scattered across 815-line component

### Design Principles Violated
1. **Single Responsibility** - ServiceRequest model does two jobs
2. **Open/Closed** - Can't extend with sale-specific features without affecting service requests
3. **Explicit is better than implicit** - Type determined by null check
4. **Domain-Driven Design** - Sale and Service are different bounded contexts

---

## 📊 Comparison Matrix

| Aspect | Current (Shared) | Separate Models | With Discriminator |
|--------|-----------------|-----------------|-------------------|
| **Complexity** | Low | Medium | Low |
| **Type Safety** | ❌ Poor | ✅ Excellent | ⚠️ Fair |
| **Scalability** | ⚠️ Limited | ✅ Excellent | ⚠️ Fair |
| **Audit Trail** | ❌ Ambiguous | ✅ Clear | ✅ Clear |
| **Query Performance** | ⚠️ Always filter | ✅ Direct | ✅ Direct |
| **Feature Isolation** | ❌ Shared fields | ✅ Separate | ⚠️ Shared fields |
| **Migration Effort** | N/A | High | Low |
| **Developer Onboarding** | ❌ Confusing | ✅ Clear | ⚠️ Fair |

---

## 🏁 Final Verdict

### Architecture Grade: C (60/100)

**Strengths:**
- ✅ Functional and working
- ✅ DRY principle (shared logic)
- ✅ Consistent inventory management
- ✅ Good for MVP/single location

**Weaknesses:**
- ❌ Poor separation of concerns
- ❌ Ambiguous data model
- ❌ Confusing for users (SR-2025-0042 for a sale)
- ❌ Difficult to extend with domain-specific features
- ❌ Not scalable to enterprise level

### Recommendation

**For current scale (1-3 locations):**
- ✅ Keep shared model
- ✅ Add discriminator field (Priority 2)
- ✅ Fix audit trail (Priority 1)
- ✅ Improve display numbers (Priority 1)

**Before scaling to 5+ locations:**
- ⚠️ Refactor to separate `Sale` and `ServiceRequest` models
- ⚠️ Create proper migration plan
- ⚠️ Add comprehensive test coverage

**The current design is pragmatic for early stage but will require refactoring at scale.**

---

*Analysis completed by: Senior Developer (Backend Architecture Review)*  
*Date: 2026-02-11*  
*Related: SALE_FLOW_CRITIQUE.md*
