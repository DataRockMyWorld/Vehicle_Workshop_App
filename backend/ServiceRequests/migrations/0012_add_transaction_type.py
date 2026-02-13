# Generated migration for adding transaction_type discriminator field

from django.db import migrations, models


def populate_transaction_type(apps, schema_editor):
    """Backfill transaction_type based on vehicle presence."""
    ServiceRequest = apps.get_model('ServiceRequests', 'ServiceRequest')
    
    # Mark all records with vehicle=null as sales
    sales_count = ServiceRequest.objects.filter(vehicle__isnull=True).update(transaction_type='sale')
    print(f"Marked {sales_count} records as 'sale'")
    
    # Mark all records with vehicle as service requests
    service_count = ServiceRequest.objects.filter(vehicle__isnull=False).update(transaction_type='service')
    print(f"Marked {service_count} records as 'service'")


def reverse_transaction_type(apps, schema_editor):
    """Reverse migration - no action needed, field will be dropped."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ServiceRequests', '0011_alter_servicerequest_display_number'),
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
                help_text='Type of transaction: sale (no vehicle) or service request (with vehicle)'
            ),
        ),
        migrations.RunPython(populate_transaction_type, reverse_transaction_type),
    ]
