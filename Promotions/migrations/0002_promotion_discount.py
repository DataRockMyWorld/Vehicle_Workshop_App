from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Promotions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="promotion",
            name="discount_percent",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Percentage off (0-100). Use this OR discount_amount.",
                max_digits=5,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="promotion",
            name="discount_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Fixed amount off. Use this OR discount_percent.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="promotion",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
