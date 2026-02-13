# Generated for Meta and help_text sync

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Inventories", "0002_inventory_enhancements"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="inventory",
            options={
                "ordering": ["site", "product__name"],
                "verbose_name_plural": "Inventories",
            },
        ),
        migrations.AlterField(
            model_name="inventory",
            name="bin_location",
            field=models.CharField(
                blank=True,
                help_text="Shelf/bin location in store or warehouse",
                max_length=80,
            ),
        ),
        migrations.AlterField(
            model_name="inventory",
            name="quantity_on_hand",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="inventory",
            name="quantity_reserved",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Reserved for in‑progress jobs, not yet used",
            ),
        ),
        migrations.AlterField(
            model_name="inventory",
            name="reorder_level",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Alert when stock on hand falls at or below this",
            ),
        ),
        migrations.AlterField(
            model_name="inventory",
            name="reorder_quantity",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Suggested order quantity when restocking",
            ),
        ),
        migrations.AlterField(
            model_name="inventory",
            name="restricted_edit",
            field=models.BooleanField(
                default=True,
                help_text="Only superusers can modify when True",
            ),
        ),
        migrations.AlterField(
            model_name="inventorytransaction",
            name="quantity",
            field=models.IntegerField(
                help_text="Positive for IN/RETURN/RESERVE, negative for OUT/RELEASE; absolute for ADJUST/COUNT"
            ),
        ),
        migrations.AlterField(
            model_name="inventorytransaction",
            name="reference_type",
            field=models.CharField(
                blank=True,
                help_text="e.g. product_usage, adjustment, purchase_order",
                max_length=60,
            ),
        ),
    ]
