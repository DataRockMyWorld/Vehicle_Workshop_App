from .models import Invoice
from .serializers import InvoiceSerializer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

# Create your views here.
class InvoiceListCreateView(generics.ListCreateAPIView):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]