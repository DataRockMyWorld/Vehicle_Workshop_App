from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ServiceRequests", "0004_servicerequest_created_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicerequest",
            name="labor_cost",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Workmanship / servicing labor cost for this job",
                max_digits=10,
            ),
        ),
    ]
