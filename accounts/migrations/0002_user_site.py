# Add site FK to CustomUser for site-scoped access

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("Site", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="site",
            field=models.ForeignKey(
                blank=True,
                help_text="If set, user only sees data for this site. Null = HQ / all sites.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="staff",
                to="Site.site",
            ),
        ),
    ]
