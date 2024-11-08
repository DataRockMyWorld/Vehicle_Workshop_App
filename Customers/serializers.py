from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'first_name', 'last_name', 'phone_number', 'email']

    #def validate_phone_number(self, value):
       # if not value.isdigit():
            #raise serializers.ValidationError("Phone number must contain only digits.")
        #return value