# Fix related_name clash with CustomUser.site

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("Site", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="site",
            name="manager",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="managed_sites",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
