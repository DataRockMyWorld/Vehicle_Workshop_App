# Comprehensive Implementation Strategy
## Vehicle Workshop App - Sales & Service Request Improvements

**Project Duration:** 3-4 weeks  
**Target:** Transform from MVP to production-ready system  
**Impact:** 60% faster transactions, clearer architecture, better UX

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Implementation Phases](#implementation-phases)
3. [Detailed Task Breakdown](#detailed-task-breakdown)
4. [Database Migrations Strategy](#database-migrations-strategy)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)
7. [Rollback Plan](#rollback-plan)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problems to Solve

1. **Architecture Issues:**
   - Sales and service requests share same model (polymorphic single table)
   - Ambiguous audit trail (all say "Service request")
   - Display numbers use same sequence (SR-XXXX for sales)
   - No type safety (vehicle=null determines type)

2. **UX Issues:**
   - 8-step, 60-90 second transaction flow
   - No progressive disclosure
   - Missing quick sale modal
   - No keyboard shortcuts
   - Completion and payment are separate steps

3. **Data Quality:**
   - Sales can have labor_cost, service_type, assigned_mechanic (invalid)
   - No validation preventing nonsensical data
   - No refund/return mechanism

### Solution Approach

**Two-Phase Strategy:**

**Phase 1 (Week 1-2):** Quick wins without major refactoring
- Add discriminator field to existing model
- Fix audit trail and display numbers
- Improve UX with quick sale modal
- Add validation and keyboard shortcuts

**Phase 2 (Week 3-4):** Architectural improvements
- Create proper Sale model (separate table)
- Migrate existing data
- Add refund/return flow
- Performance optimizations

---

## Implementation Phases

### Phase 1: Foundation & Quick Wins (Week 1-2)

**Goal:** Improve system without breaking changes  
**Risk Level:** 🟢 Low  
**User Impact:** Immediate 40% improvement in transaction speed

#### Phase 1A: Backend Foundation (Days 1-3)

```
Day 1: Database Schema Updates
├── Add transaction_type discriminator field
├── Add separate display number sequences
├── Create migration with data backfill
└── Deploy to staging

Day 2: Backend Validation & Audit
├── Add model validation (no labor_cost on sales)
├── Fix inventory transaction notes
├── Add transaction_type to serializers
└── Update API responses

Day 3: Testing & Documentation
├── Write unit tests for new validations
├── Test migration on copy of production DB
├── Update API documentation
└── Code review
```

#### Phase 1B: Frontend UX Improvements (Days 4-7)

```
Day 4: Quick Sale Modal
├── Create QuickSaleModal component
├── Add barcode scanner support prep
├── Implement keyboard shortcuts (Ctrl+N, Ctrl+Enter)
└── Add to PartsSalePage

Day 5: Merge Completion + Payment
├── Create CompleteSaleModal component
├── Combine complete + payment into single step
├── Add payment method selection
├── Show change calculation
└── Replace separate buttons with modal trigger

Day 6: Improve Product Search
├── Add quantity adjustment in search dropdown
├── Show stock levels inline
├── Add recent items quick-add
└── Improve keyboard navigation

Day 7: Polish & Testing
├── Add loading states
├── Error handling improvements
├── Responsive design fixes
└── User acceptance testing
```

### Phase 2: Architectural Refactoring (Week 3-4)

**Goal:** Separate Sale and ServiceRequest models  
**Risk Level:** 🟡 Medium  
**User Impact:** Long-term scalability, cleaner codebase

#### Phase 2A: Sale Model Creation (Days 8-10)

```
Day 8: New Models
├── Create Sale model (separate table)
├── Create SaleItem model (replaces ProductUsage for sales)
├── Keep ServiceRequest unchanged
└── Write migrations

Day 9: API Layer
├── Create SaleSerializer
├── Create SaleListCreateView
├── Create SaleDetailView
├── Create CompleteSaleView
├── Add URL patterns (/api/v1/sales/)
└── Keep old endpoints for backward compatibility

Day 10: Business Logic
├── Extract shared inventory logic to service
├── Create complete_sale() function
├── Update invoice generation to handle both models
└── Add sale-specific features (refunds prep)
```

#### Phase 2B: Frontend Migration (Days 11-14)

```
Day 11: New Sale Components
├── Create SaleDetailPage (separate from ServiceRequestDetailPage)
├── Update PartsSaleCreatePage to use new API
├── Update PartsSalePage to use new API
└── Add sale-specific features

Day 12: Data Migration
├── Migrate existing ServiceRequest records with vehicle=null
├── Create Sale records from ServiceRequest
├── Migrate ProductUsage to SaleItem
├── Update Invoice references
└── Verify data integrity

Day 13: Routing & Integration
├── Update React Router (/sales/:id instead of /service-requests/:id)
├── Add redirects for old URLs
├── Update navigation menu
└── Update breadcrumbs

Day 14: Testing & Cleanup
├── Integration tests
├── End-to-end tests
├── Remove old code paths
└── Update documentation
```

#### Phase 2C: Advanced Features (Days 15-20)

```
Day 15: Refund/Return System
├── Add Invoice.status field (pending, paid, refunded)
├── Create RefundView API endpoint
├── Implement reverse inventory transactions
└── Add refund reasons tracking

Day 16: Refund UI
├── Create RefundModal component
├── Add "Refund" button on completed sales
├── Show refund history
└── Update revenue reports

Day 17: Advanced POS Features
├── Barcode scanner integration
├── Recent items quick-add buttons
├── Keyboard shortcuts documentation
└── Print queue management

Day 18: Mobile Optimization
├── Touch-friendly buttons (min 44px)
├── Mobile-responsive product search
├── Swipe gestures for table rows
└── Offline mode prep (PWA)

Day 19: Performance Optimization
├── Implement inventory caching
├── Lazy load product images
├── Add database indexes
└── Optimize N+1 queries

Day 20: Polish & Final Testing
├── User acceptance testing with staff
├── Fix bugs from UAT
├── Performance benchmarking
└── Documentation updates
```

---

## Detailed Task Breakdown

### TASK 1: Add Transaction Type Discriminator

**File:** `ServiceRequests/models.py`

**Changes:**
```python
class ServiceRequest(models.Model):
    # NEW FIELD
    TRANSACTION_TYPE_CHOICES = [
        ('sale', 'Sale'),
        ('service', 'Service Request'),
    ]
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        default='service',
        db_index=True,
        help_text="Type of transaction: sale (no vehicle) or service request (with vehicle)"
    )
    
    # ... existing fields ...
    
    def save(self, *args, **kwargs):
        # Auto-populate transaction_type based on vehicle
        if not self.transaction_type:
            self.transaction_type = 'sale' if self.vehicle_id is None else 'service'
        
        # Generate appropriate display number
        if not self.display_number:
            prefix = "SALE" if self.transaction_type == 'sale' else "SR"
            self.display_number = get_next_display_number(prefix, pad=4)
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate transaction type consistency."""
        from django.core.exceptions import ValidationError
        
        # Sales should not have vehicle
        if self.transaction_type == 'sale' and self.vehicle_id is not None:
            raise ValidationError("Sales cannot have an associated vehicle.")
        
        # Service requests must have vehicle
        if self.transaction_type == 'service' and self.vehicle_id is None:
            raise ValidationError("Service requests must have an associated vehicle.")
        
        # Sales should not have service-specific fields
        if self.transaction_type == 'sale':
            if self.service_type_id is not None:
                raise ValidationError("Sales cannot have a service type.")
            if self.assigned_mechanic_id is not None:
                raise ValidationError("Sales cannot have an assigned mechanic.")
            if self.labor_cost and self.labor_cost > 0:
                raise ValidationError("Sales cannot have labor costs.")
```

**Migration:**
```python
# ServiceRequests/migrations/000X_add_transaction_type.py
from django.db import migrations, models

def populate_transaction_type(apps, schema_editor):
    ServiceRequest = apps.get_model('ServiceRequests', 'ServiceRequest')
    
    # Mark all records with vehicle=null as sales
    ServiceRequest.objects.filter(vehicle__isnull=True).update(transaction_type='sale')
    
    # Mark all records with vehicle as service requests
    ServiceRequest.objects.filter(vehicle__isnull=False).update(transaction_type='service')

def reverse_transaction_type(apps, schema_editor):
    # No-op, field can be dropped
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('ServiceRequests', '000X_previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='transaction_type',
            field=models.CharField(
                max_length=20,
                choices=[('sale', 'Sale'), ('service', 'Service Request')],
                default='service',
                db_index=True,
            ),
        ),
        migrations.RunPython(populate_transaction_type, reverse_transaction_type),
    ]
```

**Testing:**
```python
# ServiceRequests/tests.py
class ServiceRequestModelTestCase(TestCase):
    def test_sale_auto_sets_transaction_type(self):
        sale = ServiceRequest.objects.create(
            customer=self.customer,
            vehicle=None,  # No vehicle = sale
            site=self.site,
            description='Parts sale',
            status='Pending'
        )
        self.assertEqual(sale.transaction_type, 'sale')
        self.assertTrue(sale.display_number.startswith('SALE-'))
    
    def test_service_request_auto_sets_transaction_type(self):
        sr = ServiceRequest.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,  # Has vehicle = service
            site=self.site,
            description='Brake repair',
            status='Pending'
        )
        self.assertEqual(sr.transaction_type, 'service')
        self.assertTrue(sr.display_number.startswith('SR-'))
    
    def test_sale_cannot_have_labor_cost(self):
        with self.assertRaises(ValidationError):
            sale = ServiceRequest(
                customer=self.customer,
                vehicle=None,
                site=self.site,
                transaction_type='sale',
                labor_cost=50.00,
                description='Sale',
                status='Pending'
            )
            sale.full_clean()
```

---

### TASK 2: Fix Inventory Transaction Audit Trail

**File:** `ServiceRequests/tasks.py`

**Changes:**
```python
def _do_adjust_inventory(service_request_id):
    """
    Adjusts inventory quantities based on products used in a completed transaction.
    """
    from Inventories.models import Inventory, InventoryTransaction, TransactionType

    service_request = ServiceRequest.objects.select_related("site", "customer").get(id=service_request_id)
    site = service_request.site
    product_usages = ProductUsage.objects.select_related("product").filter(service_request=service_request)
    
    # NEW: Determine entity type for audit trail
    entity_type = "Sale" if service_request.transaction_type == 'sale' else "Service"
    display_ref = service_request.display_number or f"#{service_request_id}"
    customer_name = f"{service_request.customer.first_name} {service_request.customer.last_name}"

    for usage in product_usages:
        inv = (
            Inventory.objects.select_for_update()
            .filter(product=usage.product, site=site)
            .first()
        )
        if not inv:
            raise ValueError(
                f"No inventory record for {usage.product.name} at site {site.name}. "
                f"Add stock first."
            )
        if inv.quantity_on_hand < usage.quantity_used:
            raise ValueError(
                f"Insufficient inventory for {usage.product.name} "
                f"(have {inv.quantity_on_hand}, need {usage.quantity_used})."
            )
        
        inv.quantity_on_hand -= usage.quantity_used
        inv.save(update_fields=["quantity_on_hand"])
        
        # IMPROVED: Clear audit trail with entity type and customer
        InventoryTransaction.objects.create(
            inventory=inv,
            transaction_type=TransactionType.OUT,
            quantity=-usage.quantity_used,
            reference_type="product_usage",
            reference_id=usage.id,
            notes=f"{entity_type} {display_ref} - Customer: {customer_name}",
        )
```

---

### TASK 3: Add Serializer Validation

**File:** `ServiceRequests/serializers.py`

**Changes:**
```python
class ServiceRequestSerializer(serializers.ModelSerializer):
    service_type_display = serializers.SerializerMethodField()
    transaction_type = serializers.CharField(required=False)  # Auto-populated

    class Meta:
        model = ServiceRequest
        fields = '__all__'
        read_only_fields = ['transaction_type', 'display_number']

    def get_service_type_display(self, obj):
        if not obj.service_type_id:
            return None
        st = getattr(obj, "service_type", None)
        if st:
            return f"{st.category.name} — {st.name}"
        return None
    
    def validate(self, data):
        """Validate transaction type consistency."""
        vehicle = data.get('vehicle')
        service_type = data.get('service_type')
        labor_cost = data.get('labor_cost', 0)
        assigned_mechanic = data.get('assigned_mechanic')
        
        # Determine if this is a sale (no vehicle)
        is_sale = vehicle is None
        
        if is_sale:
            # Sales validation
            if service_type is not None:
                raise serializers.ValidationError({
                    'service_type': 'Sales cannot have a service type.'
                })
            if assigned_mechanic is not None:
                raise serializers.ValidationError({
                    'assigned_mechanic': 'Sales cannot have an assigned mechanic.'
                })
            if labor_cost and labor_cost > 0:
                raise serializers.ValidationError({
                    'labor_cost': 'Sales cannot have labor costs.'
                })
        else:
            # Service request validation
            if not service_type:
                # Warning, not error (service_type is optional for now)
                pass
        
        return data
    
    def create(self, validated_data):
        # Auto-set transaction_type
        vehicle = validated_data.get('vehicle')
        validated_data['transaction_type'] = 'sale' if vehicle is None else 'service'
        return super().create(validated_data)
```

---

### TASK 4: Quick Sale Modal Component

**File:** `frontend/src/components/QuickSaleModal.tsx`

**New File:**
```typescript
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { serviceRequests, products, inventory, productUsage, invoices } from '../api/services'
import { useAuth } from '../context/AuthContext'
import ProductSearch from './ProductSearch'
import { formatCurrency } from '../utils/currency'
import './QuickSaleModal.css'

interface QuickSaleItem {
  productId: number
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  availableQty: number
}

interface QuickSaleModalProps {
  isOpen: boolean
  onClose: () => void
  walkinCustomerId: number
  siteId: number
}

export default function QuickSaleModal({ isOpen, onClose, walkinCustomerId, siteId }: QuickSaleModalProps) {
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [items, setItems] = useState<QuickSaleItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'pos'>('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [discount, setDiscount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const productSearchRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Focus product search on open
      setTimeout(() => productSearchRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        handleComplete()
      } else if (e.key === 'F2') {
        e.preventDefault()
        productSearchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, items, paymentMethod, discount])

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const discountAmount = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmount)
  const tendered = parseFloat(amountTendered) || 0
  const change = Math.max(0, tendered - total)

  const handleAddItem = (product: any) => {
    if (!product || quantity < 1) return
    
    const existing = items.find(item => item.productId === product.id)
    if (existing) {
      // Update quantity
      setItems(items.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity, lineTotal: (item.quantity + quantity) * item.unitPrice }
          : item
      ))
    } else {
      // Add new item
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.unit_price || 0,
        lineTotal: quantity * (product.unit_price || 0),
        availableQty: product.available_qty || 0,
      }])
    }
    
    setSelectedProductId('')
    setQuantity(1)
    productSearchRef.current?.focus()
  }

  const handleRemoveItem = (productId: number) => {
    setItems(items.filter(item => item.productId !== productId))
  }

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(productId)
      return
    }
    
    setItems(items.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice }
        : item
    ))
  }

  const handleComplete = async () => {
    if (items.length === 0) {
      setError('Add at least one item to complete the sale.')
      return
    }
    
    if (paymentMethod === 'cash' && tendered < total) {
      setError('Amount tendered must be at least the total amount.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      // 1. Create service request (sale)
      const salePayload = {
        customer: walkinCustomerId,
        site: siteId,
        vehicle: null,
        status: 'Pending',
        service_type: null,
        description: 'Quick Sale',
      }
      const sale = await serviceRequests.create(salePayload) as { id: number }

      // 2. Add all items
      for (const item of items) {
        await productUsage.create({
          service_request: sale.id,
          product: item.productId,
          quantity_used: item.quantity,
        })
      }

      // 3. Complete the sale (adjusts inventory, creates invoice)
      const completePayload: any = {}
      if (discountAmount > 0) {
        completePayload.discount_amount = discountAmount
      }
      await serviceRequests.complete(sale.id, completePayload)

      // 4. Mark invoice as paid
      const invoiceList = await invoices.list() as any
      const invoice = invoiceList.results?.find((inv: any) => inv.service_request === sale.id)
      if (invoice) {
        await invoices.update(invoice.id, {
          paid: true,
          payment_method: paymentMethod,
        })
      }

      // 5. Navigate to sale detail (for receipt printing)
      navigate(`/service-requests/${sale.id}`)
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to complete sale')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Quick Sale</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body quick-sale">
          {error && (
            <div className="alert alert--error" role="alert">{error}</div>
          )}

          {/* Product Search */}
          <div className="quick-sale__search">
            <ProductSearch
              ref={productSearchRef}
              placeholder="Scan barcode or search product (F2)"
              onSelect={handleAddItem}
              siteId={siteId}
            />
            <input
              type="number"
              min={1}
              className="input quick-sale__qty"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Qty"
            />
          </div>

          {/* Items List */}
          {items.length > 0 ? (
            <div className="quick-sale__items">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        {item.productName}
                        {item.sku && <span className="text-muted"> ({item.sku})</span>}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={item.availableQty}
                          className="input input--sm"
                          style={{ width: '70px' }}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="quick-sale__empty">
              No items added. Search or scan products to add them to the sale.
            </div>
          )}

          {/* Totals & Payment */}
          <div className="quick-sale__footer">
            <div className="quick-sale__totals">
              <div className="quick-sale__total-row">
                <span>Subtotal</span>
                <span className="quick-sale__amount">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="quick-sale__total-row">
                <span>Discount</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  step={0.01}
                  className="input input--sm"
                  style={{ width: '120px', textAlign: 'right' }}
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="quick-sale__total-row quick-sale__total-row--main">
                <span>Total</span>
                <span className="quick-sale__amount quick-sale__amount--large">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="quick-sale__payment">
              <div className="quick-sale__payment-method">
                <label className="label">Payment Method</label>
                <div className="button-group">
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'cash' ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'momo' ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setPaymentMethod('momo')}
                  >
                    MoMo
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'pos' ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setPaymentMethod('pos')}
                  >
                    POS
                  </button>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="quick-sale__cash">
                  <div className="form-group">
                    <label className="label">Amount Tendered</label>
                    <input
                      type="number"
                      min={total}
                      step={0.01}
                      className="input"
                      placeholder={total.toFixed(2)}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {tendered > 0 && (
                    <div className="quick-sale__change">
                      <span>Change</span>
                      <span className="quick-sale__change-amount">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            className="btn btn--success btn--large"
            onClick={handleComplete}
            disabled={submitting || items.length === 0}
          >
            {submitting ? 'Processing…' : `Complete & Print (Ctrl+Enter)`}
          </button>
        </div>

        <div className="quick-sale__shortcuts">
          <kbd>F2</kbd> Focus search • <kbd>Esc</kbd> Cancel • <kbd>Ctrl+Enter</kbd> Complete
        </div>
      </div>
    </div>
  )
}
```

---

### TASK 5: Create Sale Model (Phase 2)

**File:** `Sales/models.py` (NEW APP)

```python
from decimal import Decimal
from django.db import models
from common.models import get_next_display_number
from Customers.models import Customer
from Site.models import Site
from Products.models import Product


class Sale(models.Model):
    """
    Standalone sale model for retail transactions (no vehicle service).
    Separated from ServiceRequest for clearer domain boundaries.
    """
    display_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        db_index=True,
        help_text="Human-readable ID, e.g. SALE-2025-0042",
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='sales')
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='sales')
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),  # Being built, can be deleted
            ('pending', 'Pending Payment'),  # Finalized, awaiting payment
            ('completed', 'Completed'),  # Paid and finalized
            ('refunded', 'Refunded'),  # Returned/refunded
        ],
        default='draft'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=[('cash', 'Cash'), ('momo', 'MoMo'), ('pos', 'POS')],
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True, help_text="Optional sale notes")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_created'
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['site', '-created_at']),
        ]

    def __str__(self):
        return f"Sale {self.display_number or self.id} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.display_number:
            self.display_number = get_next_display_number("SALE", pad=4)
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return sum(item.line_total for item in self.items.all())

    @property
    def is_draft(self):
        return self.status == 'draft'

    @property
    def is_completed(self):
        return self.status == 'completed'


class SaleItem(models.Model):
    """
    Individual line item in a sale.
    Replaces ProductUsage for sales.
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price at time of sale (snapshot)"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Line-item discount"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    @property
    def line_total(self):
        return (self.unit_price * self.quantity) - self.discount_amount

    def save(self, *args, **kwargs):
        # Snapshot price at time of sale
        if not self.unit_price:
            self.unit_price = self.product.unit_price
        super().save(*args, **kwargs)
```

---

## Database Migrations Strategy

### Migration Sequence

```
1. Phase 1 Migrations (Non-breaking)
   ├── 0001_add_transaction_type.py
   │   ├── Add transaction_type field (default='service')
   │   ├── Backfill based on vehicle presence
   │   └── Add index on transaction_type
   │
   ├── 0002_update_display_numbers.py
   │   ├── Add temporary field: new_display_number
   │   ├── Generate SALE-XXXX for sales, SR-XXXX for services
   │   ├── Copy new_display_number → display_number
   │   └── Drop temporary field
   │
   └── 0003_add_validation_constraints.py
       ├── Add check: sales have no service_type
       ├── Add check: sales have no assigned_mechanic
       └── Add check: sales have labor_cost = 0

2. Phase 2 Migrations (Data migration)
   ├── 0004_create_sale_model.py
   │   ├── Create Sales app
   │   ├── Create Sale model
   │   └── Create SaleItem model
   │
   ├── 0005_migrate_sales_data.py
   │   ├── Copy ServiceRequest (vehicle=null) → Sale
   │   ├── Copy ProductUsage → SaleItem
   │   ├── Update Invoice.sale_id references
   │   └── Verify data integrity
   │
   └── 0006_cleanup_old_sales.py
       ├── Soft-delete migrated ServiceRequests (add migrated_to_sale_id)
       ├── Keep for 30 days for rollback
       └── Add cleanup script for later purge
```

### Safe Migration Script

```python
# ServiceRequests/migrations/0005_migrate_sales_data.py
from django.db import migrations

def migrate_sales_to_new_model(apps, schema_editor):
    """
    Migrate ServiceRequest records with transaction_type='sale'
    to the new Sale model.
    """
    ServiceRequest = apps.get_model('ServiceRequests', 'ServiceRequest')
    ProductUsage = apps.get_model('ServiceRequests', 'ProductUsage')
    Sale = apps.get_model('Sales', 'Sale')
    SaleItem = apps.get_model('Sales', 'SaleItem')
    Invoice = apps.get_model('Invoices', 'Invoice')
    
    sales_to_migrate = ServiceRequest.objects.filter(transaction_type='sale')
    
    for old_sale in sales_to_migrate:
        # Create new Sale
        new_sale = Sale.objects.create(
            display_number=old_sale.display_number,
            customer_id=old_sale.customer_id,
            site_id=old_sale.site_id,
            status='completed' if old_sale.status == 'Completed' else 'pending',
            notes=old_sale.description,
            created_at=old_sale.created_at,
        )
        
        # Migrate ProductUsage → SaleItem
        usages = ProductUsage.objects.filter(service_request=old_sale)
        for usage in usages:
            SaleItem.objects.create(
                sale=new_sale,
                product_id=usage.product_id,
                quantity=usage.quantity_used,
                unit_price=usage.product.unit_price,  # Current price
                created_at=usage.created_at if hasattr(usage, 'created_at') else old_sale.created_at,
            )
        
        # Update Invoice reference
        Invoice.objects.filter(service_request=old_sale).update(
            sale=new_sale,
            service_request=None  # Clear old reference
        )
        
        # Mark old record as migrated (soft delete)
        old_sale.migrated_to_sale_id = new_sale.id
        old_sale.save(update_fields=['migrated_to_sale_id'])
    
    print(f"Migrated {sales_to_migrate.count()} sales to new Sale model.")

def reverse_migration(apps, schema_editor):
    """Rollback: restore ServiceRequests from Sales."""
    Sale = apps.get_model('Sales', 'Sale')
    ServiceRequest = apps.get_model('ServiceRequests', 'ServiceRequest')
    Invoice = apps.get_model('Invoices', 'Invoice')
    
    for sale in Sale.objects.all():
        # Find original ServiceRequest
        old_sr = ServiceRequest.objects.filter(migrated_to_sale_id=sale.id).first()
        if old_sr:
            # Restore invoice reference
            Invoice.objects.filter(sale=sale).update(
                service_request=old_sr,
                sale=None
            )
            old_sr.migrated_to_sale_id = None
            old_sr.save(update_fields=['migrated_to_sale_id'])

class Migration(migrations.Migration):
    dependencies = [
        ('ServiceRequests', '0004_create_sale_model'),
        ('Sales', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrate_sales_to_new_model, reverse_migration),
    ]
```

---

## Testing Strategy

### Test Coverage Requirements

```
1. Unit Tests (85% coverage minimum)
   ├── Model tests
   │   ├── ServiceRequest.transaction_type auto-population
   │   ├── Display number generation (SALE vs SR)
   │   ├── Validation (sales can't have labor_cost)
   │   └── Clean method constraints
   │
   ├── Serializer tests
   │   ├── Validation rules
   │   ├── transaction_type in responses
   │   └── Error messages
   │
   └── View tests
       ├── List filtering (?parts_only=true)
       ├── Create with validation
       ├── Complete sale flow
       └── Permission checks

2. Integration Tests
   ├── Complete sale flow (create → add items → complete → pay)
   ├── Inventory adjustment verification
   ├── Invoice generation
   ├── Notification sending (mocked)
   └── Audit trail accuracy

3. End-to-End Tests (Playwright/Cypress)
   ├── Quick sale modal workflow
   ├── Keyboard shortcuts
   ├── Product search
   ├── Payment and change calculation
   └── Receipt printing

4. Performance Tests
   ├── Sale completion under load (100 concurrent)
   ├── Inventory locking (no race conditions)
   ├── Query optimization (N+1 detection)
   └── Response time benchmarks

5. Manual UAT Checklist
   ├── Staff completes 10 quick sales (target: < 20s each)
   ├── Test all payment methods
   ├── Test barcode scanner (if available)
   ├── Verify receipts print correctly
   ├── Check inventory accuracy
   └── Verify reports show correct data
```

### Test Example

```python
# Sales/tests.py
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Sale, SaleItem
from Customers.models import Customer
from Site.models import Site
from Products.models import Product
from Inventories.models import Inventory

User = get_user_model()

class SaleWorkflowTestCase(TestCase):
    """Test complete sale workflow from creation to payment."""
    
    def setUp(self):
        self.user = User.objects.create_user(username='cashier', password='test')
        self.site = Site.objects.create(name='Main Shop', location='123 Main St')
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            phone_number='+233501234567',
            site=self.site
        )
        self.product = Product.objects.create(
            name='Brake Pads',
            sku='BP-001',
            unit_price=Decimal('50.00'),
            is_active=True
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            site=self.site,
            quantity_on_hand=100
        )
    
    def test_complete_sale_workflow(self):
        """Test: Create sale → Add items → Complete → Verify inventory."""
        
        # Step 1: Create draft sale
        sale = Sale.objects.create(
            customer=self.customer,
            site=self.site,
            status='draft',
            created_by=self.user
        )
        self.assertTrue(sale.display_number.startswith('SALE-'))
        self.assertTrue(sale.is_draft)
        
        # Step 2: Add items
        item = SaleItem.objects.create(
            sale=sale,
            product=self.product,
            quantity=2,
            unit_price=self.product.unit_price
        )
        self.assertEqual(item.line_total, Decimal('100.00'))
        self.assertEqual(sale.subtotal, Decimal('100.00'))
        
        # Step 3: Complete sale (simulate complete_sale function)
        sale.status = 'completed'
        sale.payment_method = 'cash'
        sale.save()
        
        # Adjust inventory
        self.inventory.quantity_on_hand -= item.quantity
        self.inventory.save()
        
        # Step 4: Verify inventory was adjusted
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity_on_hand, 98)
        
        # Step 5: Verify sale status
        self.assertTrue(sale.is_completed)
    
    def test_insufficient_inventory_prevents_completion(self):
        """Test: Sale fails if inventory is insufficient."""
        sale = Sale.objects.create(
            customer=self.customer,
            site=self.site,
            status='draft'
        )
        
        # Try to sell more than available
        with self.assertRaises(ValueError):
            SaleItem.objects.create(
                sale=sale,
                product=self.product,
                quantity=150,  # Only 100 in stock
                unit_price=self.product.unit_price
            )
            # Simulate complete_sale validation
            if item.quantity > self.inventory.quantity_on_hand:
                raise ValueError(f"Insufficient inventory for {self.product.name}")
```

---

## Deployment Plan

### Pre-Deployment Checklist

```
□ Run all tests (100% pass rate required)
□ Test migrations on staging database
□ Backup production database
□ Review code changes (peer review + approval)
□ Update API documentation
□ Prepare rollback script
□ Schedule deployment during low-traffic period
□ Notify team of deployment window
□ Prepare monitoring dashboards
□ Test on staging environment (full workflow)
```

### Deployment Steps

```bash
# 1. Backup production database
docker exec vehicle-workshop-db pg_dump -U workshop_user workshop_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Stop non-critical services (keep API running)
docker compose stop celery celery-beat

# 3. Pull latest code
git fetch origin
git checkout main
git pull origin main

# 4. Install dependencies
docker compose build

# 5. Run migrations (Phase 1 - non-breaking)
docker compose run --rm django python manage.py migrate ServiceRequests 0001_add_transaction_type
docker compose run --rm django python manage.py migrate ServiceRequests 0002_update_display_numbers
docker compose run --rm django python manage.py migrate ServiceRequests 0003_add_validation_constraints

# 6. Verify migration success
docker compose run --rm django python manage.py shell
>>> from ServiceRequests.models import ServiceRequest
>>> print(ServiceRequest.objects.filter(transaction_type='sale').count())
>>> exit()

# 7. Collect static files
docker compose run --rm django python manage.py collectstatic --noinput

# 8. Restart all services
docker compose up -d

# 9. Run smoke tests
curl -X GET http://localhost:8000/api/v1/service_request/?parts_only=true
curl -X GET http://localhost:8000/health/

# 10. Monitor logs for errors
docker compose logs -f --tail=100 django celery

# 11. Restart stopped services
docker compose start celery celery-beat
```

### Post-Deployment Verification

```
1. Functional Tests (10 minutes)
   □ Create new sale (should show SALE-XXXX number)
   □ Create new service request (should show SR-XXXX number)
   □ Complete a sale (verify inventory adjusts)
   □ Check inventory transaction notes (should show "Sale SALE-XXXX")
   □ View sales list (?parts_only=true)
   □ Generate invoice
   □ Print receipt

2. Data Integrity Checks (5 minutes)
   □ Count sales before/after migration (should match)
   □ Verify no duplicate display numbers
   □ Check inventory transaction audit trail
   □ Verify invoice references

3. Performance Monitoring (ongoing)
   □ Response times < 200ms for list views
   □ Sale completion < 1 second
   □ No database deadlocks
   □ Celery queue processing normally
```

---

## Rollback Plan

### Rollback Triggers

Rollback immediately if:
- ❌ Migration fails or hangs (> 5 minutes)
- ❌ Data corruption detected
- ❌ Critical functionality broken (can't create sales)
- ❌ Performance degradation > 50%
- ❌ More than 5 error reports from users in first hour

### Rollback Procedure

```bash
# EMERGENCY ROLLBACK

# 1. Stop all services
docker compose down

# 2. Restore database backup
docker exec -i vehicle-workshop-db psql -U workshop_user workshop_db < backup_TIMESTAMP.sql

# 3. Checkout previous version
git checkout <previous-commit-hash>

# 4. Rebuild and restart
docker compose build
docker compose up -d

# 5. Verify system is operational
curl http://localhost:8000/health/

# 6. Notify team and users
# Post incident report
```

### Phase-Specific Rollback

**Phase 1 Rollback:**
```python
# If transaction_type field causes issues, revert migration
python manage.py migrate ServiceRequests 000X_previous_migration

# Remove transaction_type from code paths
git revert <commit-hash>
```

**Phase 2 Rollback:**
```python
# Run reverse migration to restore ServiceRequests from Sales
python manage.py migrate Sales zero
python manage.py migrate ServiceRequests 0005_migrate_sales_data --fake-initial

# Restore invoice references
python manage.py shell
>>> from django.db import transaction
>>> with transaction.atomic():
>>>     # Run reverse_migration function
>>>     ...
```

---

## Success Metrics

### Quantitative Metrics

```
1. Transaction Speed
   Before: 60-90 seconds per sale
   Target: 15-20 seconds per sale (quick sale modal)
   Measurement: Time from "New Sale" click to "Print receipt"

2. Error Rate
   Before: ~5% (validation errors, inventory issues)
   Target: < 1%
   Measurement: Failed transactions / total transactions

3. User Satisfaction
   Before: Baseline survey (N/A)
   Target: 4.5/5 average rating
   Measurement: Post-deployment user survey (1 week, 2 weeks, 1 month)

4. System Performance
   - API response time: < 200ms (p95)
   - Sale completion: < 1 second
   - Zero inventory race conditions
   - Zero data corruption incidents

5. Code Quality
   - Test coverage: > 85%
   - No critical security vulnerabilities
   - < 5 bugs reported in first week
   - All code reviewed and approved
```

### Qualitative Metrics

```
1. Staff Feedback
   □ "Easier to use than before"
   □ "Faster transactions"
   □ "Less training needed for new staff"
   □ "Fewer mistakes/errors"

2. Manager Feedback
   □ "Better visibility into sales vs service revenue"
   □ "Clearer audit trail"
   □ "Easier to track inventory"
   □ "More confidence in reports"

3. Developer Feedback
   □ "Clearer codebase"
   □ "Easier to add new features"
   □ "Better separation of concerns"
   □ "Less technical debt"
```

### Measurement Schedule

```
Week 1: Daily monitoring
  - Track all metrics
  - Fix critical bugs immediately
  - Collect user feedback

Week 2-4: Weekly monitoring
  - Review metrics trends
  - Address non-critical issues
  - Optimize based on usage patterns

Month 2+: Monthly review
  - Assess long-term impact
  - Plan Phase 2 (if Phase 1 successful)
  - Continuous improvement
```

---

## Risk Assessment & Mitigation

### High Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Full backup before migration, test on staging first, soft-delete old records |
| Inventory race conditions | Medium | High | Use select_for_update(), add integration tests, monitor for deadlocks |
| Display number conflicts | Low | Medium | Test migration thoroughly, add uniqueness constraints, handle conflicts gracefully |
| User resistance to new UX | Medium | Medium | Provide training, keep old flow as fallback initially, collect feedback early |
| Performance degradation | Low | High | Load test before deployment, add database indexes, monitor query performance |

### Contingency Plans

**If migration takes too long (> 30 minutes):**
- Run migration during maintenance window
- Consider batched migration (100 records at a time)
- Use Django management command instead of inline migration

**If users reject new UX:**
- Keep both old and new sale flows
- Add feature flag to toggle quick sale modal
- Collect data on which flow is preferred
- Iterate based on feedback

**If Phase 2 proves too complex:**
- Stay with Phase 1 improvements indefinitely
- Split Phase 2 into smaller increments
- Prioritize highest-value features only

---

## Communication Plan

### Stakeholder Updates

```
1. Development Team
   - Daily standups during implementation
   - Code review sessions
   - Technical documentation updates
   - Post-deployment retrospective

2. Operations/Staff
   - Pre-launch: Demo of new features (30 min)
   - Launch day: On-site support for first 2 hours
   - Post-launch: Feedback sessions (week 1, week 2)
   - Training materials: Video tutorials, quick reference guide

3. Management
   - Weekly progress reports
   - Pre-launch: Full walkthrough and Q&A
   - Post-launch: Metrics dashboard
   - Monthly business impact review

4. Customers (if applicable)
   - No direct impact (backend changes)
   - Faster service (indirect benefit)
   - Better receipts (clearer line items)
```

### Training Materials Needed

```
1. Quick Reference Guide (1-page)
   - How to use quick sale modal
   - Keyboard shortcuts cheat sheet
   - Troubleshooting common issues

2. Video Tutorials (< 5 min each)
   - "New Quick Sale Feature" (2 min)
   - "Keyboard Shortcuts to Save Time" (3 min)
   - "Understanding Sales vs Service Requests" (4 min)

3. FAQ Document
   - Why the changes?
   - What's different?
   - How do I...?
   - Who do I contact for help?
```

---

## Timeline Summary

```
┌─────────────────────────────────────────────────────────────┐
│ WEEK 1: Backend Foundation                                  │
├─────────────────────────────────────────────────────────────┤
│ Mon: Add transaction_type field, fix audit trail            │
│ Tue: Add validation, update serializers                     │
│ Wed: Write tests, deploy to staging                         │
│ Thu: Quick sale modal (frontend)                            │
│ Fri: Merge completion + payment                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WEEK 2: UX Improvements & Testing                           │
├─────────────────────────────────────────────────────────────┤
│ Mon: Keyboard shortcuts, product search improvements        │
│ Tue: Polish UI, add loading states                          │
│ Wed: Integration tests, E2E tests                           │
│ Thu: User acceptance testing with staff                     │
│ Fri: Bug fixes, deploy to production (Phase 1 complete)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WEEK 3: Sale Model Refactoring (Phase 2 - Optional)         │
├─────────────────────────────────────────────────────────────┤
│ Mon-Tue: Create Sale model, write migrations                │
│ Wed-Thu: Update API layer, migrate frontend                 │
│ Fri: Data migration, testing                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WEEK 4: Advanced Features & Production                      │
├─────────────────────────────────────────────────────────────┤
│ Mon-Tue: Refund/return system                               │
│ Wed: Mobile optimization, performance tuning                │
│ Thu: Final testing, deploy to production                    │
│ Fri: Monitoring, bug fixes, retrospective                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision Points

### Go/No-Go Checkpoints

**Checkpoint 1 (End of Week 1):**
- ✅ All Phase 1A tests passing?
- ✅ Staging environment stable?
- ✅ Code review approved?
- ✅ Database migration tested?
- **Decision:** Proceed to Phase 1B or fix issues?

**Checkpoint 2 (End of Week 2):**
- ✅ Phase 1 features working in production?
- ✅ User feedback positive?
- ✅ No critical bugs?
- ✅ Metrics showing improvement?
- **Decision:** Proceed to Phase 2 or iterate on Phase 1?

**Checkpoint 3 (Mid Week 3):**
- ✅ Sale model working in staging?
- ✅ Data migration successful?
- ✅ No performance issues?
- ✅ Team confident in changes?
- **Decision:** Continue Phase 2 or rollback to Phase 1 only?

---

## Post-Launch Support

### First Week (Critical Support Period)

```
Day 1 (Launch Day)
  - On-site support: 2 developers
  - Monitor logs continuously
  - Respond to issues within 15 minutes
  - Fix critical bugs same-day

Days 2-3
  - Remote support during business hours
  - Daily check-ins with staff
  - Track all feedback
  - Deploy hotfixes as needed

Days 4-7
  - Shift to standard support schedule
  - Weekly feedback sessions
  - Start planning optimizations
  - Measure success metrics
```

### Ongoing Maintenance

```
Monthly Tasks
  □ Review error logs
  □ Analyze performance metrics
  □ Collect user feedback
  □ Plan iterative improvements
  □ Update documentation

Quarterly Tasks
  □ Major feature additions
  □ Performance optimization sprints
  □ Security audits
  □ Dependency updates
```

---

## Conclusion

This implementation strategy provides a comprehensive, phased approach to improving the Vehicle Workshop App's sale and service request flow. 

**Phase 1 (Weeks 1-2)** delivers immediate value with minimal risk, addressing the most critical UX and data quality issues.

**Phase 2 (Weeks 3-4)** is optional but recommended if scaling beyond 3 locations, providing long-term architectural benefits.

**Success depends on:**
1. ✅ Thorough testing at each checkpoint
2. ✅ Clear communication with all stakeholders
3. ✅ Willingness to roll back if needed
4. ✅ Iterative improvements based on real usage

**Expected Outcomes:**
- 🎯 60% faster transactions (90s → 20s)
- 🎯 Clearer architecture (sales vs services)
- 🎯 Better data quality (no invalid fields)
- 🎯 Happier users (less friction)
- 🎯 Scalable foundation (ready for 5+ locations)

---

*Strategy prepared by: Senior Developer*  
*Date: 2026-02-11*  
*Next Review: After Phase 1 completion*
