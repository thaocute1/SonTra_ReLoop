import os
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from ..serializers.paypal_serializers import PayPalOrderInput, PayPalCaptureInput
from ..services.paypal_client import PayPalClient
from ..services import paypal_service


class PayPalConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'mode': 'sandbox', 'currency': 'USD', 'fx_vnd_per_usd': str(PayPalClient.rate()),
                         'available': os.getenv('PAYPAL_MODE', 'sandbox') == 'sandbox' and bool(os.getenv('PAYPAL_CLIENT_ID') and os.getenv('PAYPAL_CLIENT_SECRET'))})


class PayPalCreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PayPalOrderInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'status': 'success', 'data': paypal_service.create_checkout(request.user, serializer.validated_data['order_id'])})


class PayPalCaptureView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PayPalCaptureInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = paypal_service.capture_checkout(request.user, serializer.validated_data['paypal_order_id'])
        return Response({'status': 'success', 'data': result})


class PayPalStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        return Response({'status': 'success', 'data': paypal_service.reconcile_checkout(request.user, order_id)})


class PayPalCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PayPalOrderInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'status': 'success', 'data': paypal_service.cancel_checkout(request.user, serializer.validated_data['order_id'])})


class PayPalWebhookView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not isinstance(request.data, dict) or not request.data.get('id') or not request.data.get('event_type'):
            raise ValidationError('Webhook thiếu mã sự kiện hoặc loại sự kiện.')
        result = paypal_service.process_webhook(request.data, request.headers)
        return Response({'status': 'success', 'result': result})
