from django.db import models


class ProductCategory(models.TextChoices):
    SPARE_PART = "spare_part", "Spare part"
    ACCESSORY = "accessory", "Accessory"
    CONSUMABLE = "consumable", "Consumable"
    FLUID = "fluid", "Fluid / lubricant"
    OTHER = "other", "Other"


class UnitOfMeasure(models.TextChoices):
    EACH = "each", "Each"
    LITRE = "litre", "Litre"
    KG = "kg", "Kilogram"
    METRE = "metre", "Metre"
    BOX = "box", "Box"
    SET = "set", "Set"
    PAIR = "pair", "Pair"


class Product(models.Model):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=80, unique=True, blank=True, null=True)
    category = models.CharField(
        max_length=20,
        choices=ProductCategory.choices,
        default=ProductCategory.SPARE_PART,
    )
    description = models.TextField(blank=True)
    brand = models.CharField(max_length=100, blank=True)
    part_number = models.CharField(max_length=100, blank=True, help_text="OEM / manufacturer part number")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Cost price for margin and reporting",
    )
    unit_of_measure = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.EACH,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def margin_percent(self):
        if self.cost_price and self.cost_price > 0 and self.unit_price > 0:
            return round(((float(self.unit_price) - float(self.cost_price)) / float(self.cost_price)) * 100, 1)
        return None
