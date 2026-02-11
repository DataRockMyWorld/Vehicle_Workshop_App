# Migration to make display_number non-nullable after backfill has populated all rows.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Appointments", "0003_backfill_appointment_display_numbers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appointment",
            name="display_number",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Human-readable ID, e.g. APT-2025-0042",
                max_length=20,
                null=False,
                unique=True,
            ),
        ),
    ]
