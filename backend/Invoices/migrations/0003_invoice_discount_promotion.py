from decimal import Decimal

from django.db import migrations, models


def backfill_subtotal(apps, schema_editor):
    Invoice = apps.get_model("Invoices", "Invoice")
    for inv in Invoice.objects.all():
        inv.subtotal = inv.total_cost
        inv.discount_amount = Decimal("0")
        inv.save(update_fields=["subtotal", "discount_amount"])


class Migration(migrations.Migration):

    dependencies = [
        ("Promotions", "0002_promotion_discount"),
        ("Invoices", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="invoice",
            name="subtotal",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Amount before discount",
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name="invoice",
            name="discount_amount",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Amount discounted",
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name="invoice",
            name="promotion",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="invoices",
                to="Promotions.promotion",
            ),
        ),
        migrations.RunPython(backfill_subtotal, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="invoice",
            name="total_cost",
            field=models.DecimalField(
                decimal_places=2,
                help_text="Final amount (subtotal - discount)",
                max_digits=10,
            ),
        ),
    ]
