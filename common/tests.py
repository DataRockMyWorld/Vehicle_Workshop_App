from django.test import TestCase
from django.utils import timezone

from common.models import DisplayNumberSequence, get_next_display_number


class DisplayNumberSequenceTests(TestCase):
    """Tests for DisplayNumberSequence model and get_next_display_number helper."""

    def test_get_next_display_number_creates_sequence(self):
        """First call creates a new sequence and returns correct format."""
        year = timezone.now().year
        result = get_next_display_number("INV", pad=5)
        self.assertEqual(result, f"INV-{year}-00001")
        seq = DisplayNumberSequence.objects.get(prefix="INV", year=year)
        self.assertEqual(seq.last_value, 1)

    def test_get_next_display_number_increments(self):
        """Subsequent calls increment the sequence."""
        year = timezone.now().year
        r1 = get_next_display_number("SR", pad=4)
        r2 = get_next_display_number("SR", pad=4)
        r3 = get_next_display_number("SR", pad=4)
        self.assertEqual(r1, f"SR-{year}-0001")
        self.assertEqual(r2, f"SR-{year}-0002")
        self.assertEqual(r3, f"SR-{year}-0003")
        seq = DisplayNumberSequence.objects.get(prefix="SR", year=year)
        self.assertEqual(seq.last_value, 3)

    def test_get_next_display_number_different_prefixes(self):
        """Different prefixes have independent sequences."""
        year = timezone.now().year
        inv = get_next_display_number("INV", pad=5)
        apt = get_next_display_number("APT", pad=4)
        inv2 = get_next_display_number("INV", pad=5)
        self.assertEqual(inv, f"INV-{year}-00001")
        self.assertEqual(apt, f"APT-{year}-0001")
        self.assertEqual(inv2, f"INV-{year}-00002")

    def test_get_next_display_number_custom_pad(self):
        """Custom pad parameter affects zero-padding."""
        year = timezone.now().year
        r = get_next_display_number("X", pad=3)
        self.assertEqual(r, f"X-{year}-001")
        r2 = get_next_display_number("X", pad=6)
        self.assertEqual(r2, f"X-{year}-000002")

    def test_display_number_sequence_unique_per_prefix_year(self):
        """Sequence is unique per (prefix, year) pair."""
        year = timezone.now().year
        DisplayNumberSequence.objects.create(prefix="T", year=year, last_value=10)
        result = get_next_display_number("T", pad=4)
        self.assertEqual(result, f"T-{year}-0011")
        self.assertEqual(DisplayNumberSequence.objects.filter(prefix="T", year=year).count(), 1)


class BackfillDisplayNumbersTests(TestCase):
    """Optional: verify backfill logic assigns correct display_number format."""

    def test_backfill_appointment_function_importable_and_runnable(self):
        """Backfill migration forward function runs without error when no null rows exist."""
        import importlib.util
        from pathlib import Path

        from django.db.migrations.loader import MigrationLoader

        # Load backfill function from migration (module name starts with number)
        migration_path = (
            Path(__file__).resolve().parent.parent
            / "Appointments"
            / "migrations"
            / "0003_backfill_appointment_display_numbers.py"
        )
        spec = importlib.util.spec_from_file_location("backfill_apt", migration_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        loader = MigrationLoader(None, ignore_no_migrations=True)
        state = loader.project_state(("Appointments", "0003_backfill_appointment_display_numbers"))
        # Run backfill with empty dataset (no-op but verifies no crash)
        mod.backfill_apt_display_numbers(state.apps, schema_editor=None)
