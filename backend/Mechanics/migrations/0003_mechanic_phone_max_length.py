# Generated manually – Mechanic.phone_number max_length 15 -> 20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Mechanics", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mechanic",
            name="phone_number",
            field=models.CharField(max_length=20),
        ),
    ]
