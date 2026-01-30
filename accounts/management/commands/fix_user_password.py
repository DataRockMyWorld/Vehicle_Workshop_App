"""
Fix a user's password so they can log in.
Use when a user created via admin cannot authenticate (e.g. old plain-text password).
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Set a user's password (properly hashed) so they can log in. Use: fix_user_password <email> <new_password>"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="User email address")
        parser.add_argument("password", type=str, help="New password")

    def handle(self, *args, **options):
        User = get_user_model()
        email = options["email"].strip()
        password = options["password"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"User with email '{email}' not found."))
            return

        user.set_password(password)
        user.save(update_fields=["password"])
        self.stdout.write(self.style.SUCCESS(f"Password updated for {user.email}. They can now log in."))
