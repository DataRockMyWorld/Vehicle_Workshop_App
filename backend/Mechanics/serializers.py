from .models import Mechanic
from rest_framework import serializers


class MechanicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mechanic
        fields = '__all__'