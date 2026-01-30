

from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(['Customers', 'Invoices', 'Inventories', 'Promotions', 'ServiceRequests'])
app.conf.broker_connection_retry_on_startup = True

app.conf.beat_schedule = {
    'promotional-notifications-daily': {
        'task': 'Promotions.tasks.send_promotional_notifications',
        'schedule': crontab(hour=9, minute=0),
    },
    'service-reminders-daily': {
        'task': 'ServiceRequests.tasks.send_service_reminder',
        'schedule': crontab(hour=10, minute=0),
    },
    'stock-alerts-daily': {
        'task': 'Inventories.tasks.check_low_stock_and_alert',
        'schedule': crontab(hour=8, minute=0),
    },
}


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
