from .serializers import MechanicSerializer
from .models import Mechanic
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

class MechanicListCreateView(generics.ListCreateAPIView):
    queryset = Mechanic.objects.all()
    serializer_class = MechanicSerializer
    permission_classes = [IsAuthenticated]

class MechanicDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Mechanic.objects.all()
    serializer_class = MechanicSerializer
    permission_classes = [IsAuthenticated]