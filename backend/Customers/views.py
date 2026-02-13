from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsReadOnlyForHQ
from .models import Customer
from .serializers import CustomerSerializer


WALKIN_FIRST = "Walk-in"
WALKIN_LAST = "Customer"
WALKIN_PHONE = "0000000000"


class WalkinCustomerView(APIView):
    """GET: Returns the walk-in (anonymous) customer for quick cash sales. Creates one if none exists."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(
            first_name=WALKIN_FIRST,
            last_name=WALKIN_LAST,
            phone_number=WALKIN_PHONE,
        ).order_by("id").first()
        if customer is None:
            customer = Customer.objects.create(
                first_name=WALKIN_FIRST,
                last_name=WALKIN_LAST,
                phone_number=WALKIN_PHONE,
                email=None,
                receive_service_reminders=False,
            )
        serializer = CustomerSerializer(customer)
        return Response(serializer.data)


class CustomerListCreateView(generics.ListCreateAPIView):
    queryset = Customer.objects.all().order_by("-id")
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyForHQ]
