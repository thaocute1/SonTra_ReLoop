from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from ..services import vnpay_service


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def _parse_order_id(request):
    raw = request.data.get('order_id')
    try:
        order_id = int(raw)
    except (TypeError, ValueError):
        raise ValidationError('Mã đơn hàng (order_id) không hợp lệ.')
    if order_id <= 0:
        raise ValidationError('Mã đơn hàng (order_id) không hợp lệ.')
    return order_id


class VNPayConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'mode': 'sandbox',
            'currency': 'VND',
            'available': vnpay_service.is_configured(),
        })


class VNPayCreatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = _parse_order_id(request)
        bank_code = request.data.get('bank_code')
        data = vnpay_service.create_checkout(
            request.user,
            order_id,
            client_ip=_client_ip(request),
            bank_code=str(bank_code).strip() if bank_code is not None else None,
        )
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class VNPayReturnVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        params = request.data if isinstance(request.data, dict) else {}
        data = vnpay_service.confirm_return(request.user, params)
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class VNPayStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        data = vnpay_service.get_order_status(request.user, order_id)
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class VNPayCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = _parse_order_id(request)
        data = vnpay_service.cancel_checkout(request.user, order_id)
        return Response({'status': 'success', 'data': data}, status=status.HTTP_200_OK)


class VNPayIPNView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        result = vnpay_service.process_ipn(request.query_params.dict())
        return Response(result, status=status.HTTP_200_OK)
