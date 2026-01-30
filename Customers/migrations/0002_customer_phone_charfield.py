# Generated manually – Customer.phone_number IntegerField -> CharField

from django.db import migrations, models


def forwards_convert_phone(apps, schema_editor):
    Customer = apps.get_model("Customers", "Customer")
    for c in Customer.objects.all():
        c.phone_number_new = str(c.phone_number)
        c.save(update_fields=["phone_number_new"])


def backwards_convert_phone(apps, schema_editor):
    Customer = apps.get_model("Customers", "Customer")
    for c in Customer.objects.all():
        try:
            c.phone_number = int(c.phone_number_new or "0")
        except (ValueError, TypeError):
            c.phone_number = 0
        c.save(update_fields=["phone_number"])


class Migration(migrations.Migration):

    dependencies = [
        ("Customers", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="phone_number_new",
            field=models.CharField(max_length=20, null=True),
        ),
        migrations.RunPython(forwards_convert_phone, backwards_convert_phone),
        migrations.RemoveField(
            model_name="customer",
            name="phone_number",
        ),
        migrations.RenameField(
            model_name="customer",
            old_name="phone_number_new",
            new_name="phone_number",
        ),
        migrations.AlterField(
            model_name="customer",
            name="phone_number",
            field=models.CharField(max_length=20),
        ),
    ]
