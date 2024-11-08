from .models import Product
from rest_framework import generics
from .serializers import ProductSerializer
from accounts.permissions import IsSuperUserOrReadOnly, IsSuperUserOrSiteAdmin

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsSuperUserOrReadOnly]  # Only superusers should access this

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsSuperUserOrReadOnly]
