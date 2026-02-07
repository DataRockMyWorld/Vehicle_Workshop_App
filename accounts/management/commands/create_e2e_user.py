"""
Create or update the E2E test user for Playwright/end-to-end tests.
Defaults: admin@test.com / testpass123 (superuser, no site).
Run before E2E: docker compose exec web python manage.py create_e2e_user
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the E2E test user (admin@test.com / testpass123)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default="admin@test.com",
            help="Test user email (default: admin@test.com)",
        )
        parser.add_argument(
            "--password",
            default="testpass123",
            help="Test user password (default: testpass123)",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        email = options["email"].strip()
        password = options["password"]

        try:
            user = User.objects.get(email__iexact=email)
            created = False
        except User.DoesNotExist:
            user = User.objects.create(
                email=email,
                first_name="E2E",
                last_name="Test",
                is_superuser=True,
                is_staff=True,
            )
            created = True
        user.set_password(password)
        user.is_superuser = True
        user.is_staff = True
        user.save(update_fields=["password", "is_superuser", "is_staff"])

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created E2E user: {email}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated E2E user: {email}"))
