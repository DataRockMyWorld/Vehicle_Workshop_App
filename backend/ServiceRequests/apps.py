from django.apps import AppConfig

class ServiceRequestsConfig(AppConfig):
    name = 'ServiceRequests'

    def ready(self):
        import ServiceRequests.signals  # Import signals when the app is ready
