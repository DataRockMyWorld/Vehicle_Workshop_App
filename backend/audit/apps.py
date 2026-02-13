from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "audit"
    verbose_name = "Audit Trail"

    def ready(self):
        from django.db.models.signals import post_save, post_delete, pre_save
        from .signals import log_create, log_update, log_delete, _capture_pre_save

        from ServiceRequests.models import ServiceRequest
        from Customers.models import Customer
        from Vehicles.models import Vehicle
        from Invoices.models import Invoice
        from Inventories.models import Inventory

        for model in (ServiceRequest, Customer, Vehicle, Invoice, Inventory):
            pre_save.connect(_capture_pre_save, sender=model)
            post_save.connect(log_create, sender=model)
            post_save.connect(log_update, sender=model)
            post_delete.connect(log_delete, sender=model)
