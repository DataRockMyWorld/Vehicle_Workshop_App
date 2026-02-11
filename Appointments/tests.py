from datetime import date, time

from django.test import TestCase

from core.test_utils import WorkshopAPITestCaseMixin
from Appointments.models import Appointment


class AppointmentDisplayNumberTests(WorkshopAPITestCaseMixin, TestCase):
    """Tests for Appointment display_number auto-generation."""

    @classmethod
    def setUpTestData(cls):
        cls.setUpWorkshopData()

    def test_appointment_auto_generates_display_number_on_save(self):
        """Appointment gets APT-YYYY-NNNN display_number when created without one."""
        apt = Appointment.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            site=self.site_a,
            scheduled_date=date.today(),
            scheduled_time=time(10, 0),
        )
        self.assertTrue(apt.display_number)
        self.assertRegex(apt.display_number, r"^APT-\d{4}-\d{4}$")
