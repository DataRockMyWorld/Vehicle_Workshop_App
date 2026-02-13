# Generated for Meta and help_text sync

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Products", "0002_product_catalog_enhancements"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="product",
            options={"ordering": ["name"]},
        ),
        migrations.AlterField(
            model_name="product",
            name="cost_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Cost price for margin and reporting",
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="product",
            name="part_number",
            field=models.CharField(
                blank=True,
                help_text="OEM / manufacturer part number",
                max_length=100,
            ),
        ),
    ]
