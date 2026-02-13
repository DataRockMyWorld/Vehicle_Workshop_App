"""
Shared models for cross-app functionality.
DisplayNumberSequence tracks per-prefix, per-year sequences for human-readable IDs.
"""
from django.db import models, transaction
from django.utils import timezone


class DisplayNumberSequence(models.Model):
    """Tracks last used sequence per prefix+year for display numbers (INV-2025-00001, etc.)."""
    prefix = models.CharField(max_length=10, db_index=True)
    year = models.PositiveIntegerField(db_index=True)
    last_value = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [["prefix", "year"]]
        verbose_name = "Display number sequence"
        verbose_name_plural = "Display number sequences"

    def __str__(self):
        return f"{self.prefix}-{self.year}: {self.last_value}"


def get_next_display_number(prefix: str, pad: int = 5) -> str:
    """
    Atomically get the next display number for the given prefix.
    Format: PREFIX-YYYY-NNNNN (e.g. INV-2025-00001, SR-2025-0042).
    Thread-safe via select_for_update.
    """
    year = timezone.now().year
    with transaction.atomic():
        seq, created = DisplayNumberSequence.objects.select_for_update().get_or_create(
            prefix=prefix,
            year=year,
            defaults={"last_value": 0},
        )
        seq.last_value += 1
        seq.save(update_fields=["last_value"])
        num = seq.last_value
    return f"{prefix}-{year}-{num:0{pad}d}"
