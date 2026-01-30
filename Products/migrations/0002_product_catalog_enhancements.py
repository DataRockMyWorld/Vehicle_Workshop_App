# Generated manually for Product catalog enhancements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Products", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="sku",
            field=models.CharField(blank=True, max_length=80, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="product",
            name="category",
            field=models.CharField(
                choices=[
                    ("spare_part", "Spare part"),
                    ("accessory", "Accessory"),
                    ("consumable", "Consumable"),
                    ("fluid", "Fluid / lubricant"),
                    ("other", "Other"),
                ],
                default="spare_part",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="product",
            name="brand",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="product",
            name="part_number",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="product",
            name="cost_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="unit_of_measure",
            field=models.CharField(
                choices=[
                    ("each", "Each"),
                    ("litre", "Litre"),
                    ("kg", "Kilogram"),
                    ("metre", "Metre"),
                    ("box", "Box"),
                    ("set", "Set"),
                    ("pair", "Pair"),
                ],
                default="each",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="product",
            name="name",
            field=models.CharField(max_length=200),
        ),
        migrations.AlterField(
            model_name="product",
            name="unit_price",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
    ]
