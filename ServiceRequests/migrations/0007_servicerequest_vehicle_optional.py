# Generated migration - make vehicle optional for walk-in parts sales

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("Vehicles", "0003_vehicle_service_interval_last_reminder"),
        ("ServiceRequests", "0006_servicecategory_servicetype_servicerequest_service_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="servicerequest",
            name="vehicle",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional for walk-in parts sales (no vehicle work)",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="Vehicles.vehicle",
            ),
        ),
    ]
