"""
Shared test fixtures and base classes for workshop app tests.
Use setUpTestData to create cross-cutting data (sites, users, customers, etc.).
"""
from decimal import Decimal

from accounts.models import CustomUser
from Customers.models import Customer
from Site.models import Site
from Vehicles.models import Vehicle
from Mechanics.models import Mechanic
from Products.models import Product
from Inventories.models import Inventory
from ServiceRequests.models import ServiceRequest, ServiceCategory, ServiceType, ProductUsage


def create_superuser(email="admin@test.com", password="testpass123", **kwargs):
    return CustomUser.objects.create_user(
        email=email,
        password=password,
        first_name="Admin",
        last_name="User",
        is_superuser=True,
        is_staff=True,
        **kwargs,
    )


def create_site_user(email, password, site, **kwargs):
    user = CustomUser.objects.create_user(
        email=email,
        password=password,
        first_name="Site",
        last_name="User",
        site=site,
        **kwargs,
    )
    return user


def create_hq_user(email="ceo@test.com", password="testpass123", **kwargs):
    """HQ/CEO user: no site, read-only for most resources."""
    return CustomUser.objects.create_user(
        email=email,
        password=password,
        first_name="CEO",
        last_name="User",
        is_superuser=False,
        site=None,
        **kwargs,
    )


class WorkshopAPITestCaseMixin:
    """Mixin providing common workshop fixtures. Use with APITestCase."""

    @classmethod
    def setUpWorkshopData(cls):
        """Create sites, users, customer, vehicle, mechanic, product, inventory. Call from setUpTestData."""
        """Create sites, users, customer, vehicle, mechanic, product, inventory."""
        cls.site_a = Site.objects.create(
            name="Accra Workshop",
            location="Accra",
            contact_number="0551234567",
        )
        cls.site_b = Site.objects.create(
            name="Kumasi Workshop",
            location="Kumasi",
            contact_number="0559876543",
        )
        cls.superuser = create_superuser()
        cls.site_user = create_site_user("supervisor@accra.com", "testpass123", cls.site_a)
        cls.hq_user = create_hq_user()

        cls.customer = Customer.objects.create(
            first_name="John",
            last_name="Doe",
            phone_number="0551234567",
            email="john@example.com",
        )
        cls.vehicle = Vehicle.objects.create(
            make="Toyota",
            model="Camry",
            year=2020,
            customer=cls.customer,
            license_plate="GC-1234-20",
            site=cls.site_a,
        )
        cls.mechanic = Mechanic.objects.create(
            site=cls.site_a,
            name="Kwame",
            phone_number="0551112233",
        )
        cls.category, _ = ServiceCategory.objects.get_or_create(
            name="Mechanical", defaults={"order": 0}
        )
        cls.service_type, _ = ServiceType.objects.get_or_create(
            category=cls.category,
            name="Oil Change",
            defaults={"order": 0},
        )
        cls.product = Product.objects.create(
            name="Brake Pad Set",
            sku="BP-001",
            unit_price=Decimal("150.00"),
        )
        cls.inventory = Inventory.objects.create(
            product=cls.product,
            site=cls.site_a,
            quantity_on_hand=10,
            reorder_level=2,
        )
        cls.service_request = ServiceRequest.objects.create(
            customer=cls.customer,
            vehicle=cls.vehicle,
            site=cls.site_a,
            service_type=cls.service_type,
            description="Regular oil change",
            status="Pending",
        )
