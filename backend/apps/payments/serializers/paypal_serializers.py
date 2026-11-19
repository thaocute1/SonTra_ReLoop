from rest_framework import serializers


class PayPalOrderInput(serializers.Serializer):
    order_id = serializers.IntegerField(min_value=1)


class PayPalCaptureInput(serializers.Serializer):
    paypal_order_id = serializers.RegexField(r'^[A-Za-z0-9]{1,64}$')
