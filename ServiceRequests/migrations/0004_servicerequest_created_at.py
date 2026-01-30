from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ("ServiceRequests", "0003_productusage_servicerequest_product_used"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicerequest",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=timezone.now),
            preserve_default=False,
        ),
    ]
