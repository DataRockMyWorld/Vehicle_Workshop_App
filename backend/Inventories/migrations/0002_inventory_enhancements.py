# Generated manually for Inventory enhancements and InventoryTransaction

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_inventory_site(apps, schema_editor):
    Site = apps.get_model("Site", "Site")
    Inventory = apps.get_model("Inventories", "Inventory")
    first = Site.objects.first()
    if not first and Inventory.objects.exists():
        first = Site.objects.create(
            name="Default",
            location="Default location",
            contact_number="0000000000",
        )
    if first:
        Inventory.objects.filter(site_id__isnull=True).update(site_id=first.id)


class Migration(migrations.Migration):

    dependencies = [
        ("Products", "0002_product_catalog_enhancements"),
        ("Site", "0002_initial"),
        ("Inventories", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="inventory",
            name="site",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inventory_records",
                to="Site.site",
            ),
        ),
        migrations.RenameField(
            model_name="inventory",
            old_name="quantity",
            new_name="quantity_on_hand",
        ),
        migrations.AddField(
            model_name="inventory",
            name="quantity_reserved",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="inventory",
            name="reorder_level",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="inventory",
            name="reorder_quantity",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="inventory",
            name="bin_location",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="inventory",
            name="last_counted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="inventory",
            name="last_restocked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="inventory",
            name="product",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inventory_records",
                to="Products.product",
            ),
        ),
        migrations.RunPython(backfill_inventory_site, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="inventory",
            name="site",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inventory_records",
                to="Site.site",
            ),
        ),
        migrations.AddConstraint(
            model_name="inventory",
            constraint=models.UniqueConstraint(
                fields=("product", "site"),
                name="unique_product_site_inventory",
            ),
        ),
        migrations.CreateModel(
            name="InventoryTransaction",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "transaction_type",
                    models.CharField(
                        choices=[
                            ("in", "Stock in (restock / purchase)"),
                            ("out", "Stock out (sale / usage)"),
                            ("adjust", "Adjustment"),
                            ("return", "Return"),
                            ("reserve", "Reserve for job"),
                            ("release_reserve", "Release reservation"),
                            ("count", "Stock count"),
                        ],
                        max_length=20,
                    ),
                ),
                ("quantity", models.IntegerField()),
                ("reference_type", models.CharField(blank=True, max_length=60)),
                ("reference_id", models.PositiveIntegerField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "inventory",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transactions",
                        to="Inventories.inventory",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
