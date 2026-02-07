# Generated migration - Product: FMSI, application, position

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Products", "0003_alter_product_options_alter_product_cost_price_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="fmsi_number",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="FMSI brake pad number (industry standard)",
                max_length=80,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="application",
            field=models.TextField(
                blank=True,
                help_text="Vehicle types/models this product applies to",
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="position",
            field=models.CharField(
                blank=True,
                help_text="Installation position: FRONT, REAR, or other",
                max_length=20,
            ),
        ),
    ]
