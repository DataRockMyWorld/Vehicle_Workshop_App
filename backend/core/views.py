from django.http import JsonResponse


def health(request):
    """Health check endpoint for load balancers and containers."""
    return JsonResponse({"status": "ok"})
