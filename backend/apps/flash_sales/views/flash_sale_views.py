from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsBQL, IsVendor
from apps.flash_sales.services.flash_sale_service import FlashSaleService


def error_response(exc):
    return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class ActiveFlashSaleSessionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'success', 'data': FlashSaleService.get_active_session()})


class AdminCampaignListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def get(self, request):
        return Response({'status': 'success', 'data': FlashSaleService.get_admin_campaigns_overview()})

    def post(self, request):
        try:
            campaign = FlashSaleService.create_campaign(request.data)
            return Response({'status': 'success', 'message': 'Đã tạo chiến dịch ở trạng thái bản nháp.', 'data': campaign}, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return error_response(exc)


class AdminCampaignStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def patch(self, request, campaign_id):
        try:
            data = FlashSaleService.update_campaign_status(campaign_id, request.data.get('status'))
            return Response({'status': 'success', 'data': data})
        except ValueError as exc:
            return error_response(exc)


class AdminSessionCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def post(self, request):
        try:
            session = FlashSaleService.create_session(request.data)
            return Response({'status': 'success', 'message': 'Đã tạo phiên giờ vàng.', 'data': session}, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return error_response(exc)


class VendorCampaignItemRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def post(self, request):
        try:
            item = FlashSaleService.register_tour_item(request.data, request.user)
            return Response({'status': 'success', 'message': 'Đã gửi đăng ký và đang chờ BQL duyệt.', 'data': item}, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return error_response(exc)


class VendorRegistrationContextView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get(self, request):
        try:
            return Response({'status': 'success', 'data': FlashSaleService.get_vendor_registration_context(request.user)})
        except ValueError as exc:
            return error_response(exc)


class AdminCampaignItemReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBQL]

    def patch(self, request, item_id):
        try:
            action = request.data.get('action')
            item = FlashSaleService.review_item(item_id, action)
            message = 'Đã phê duyệt tour tham gia Flash Sale.' if action == 'approve' else 'Đã từ chối tour tham gia Flash Sale.'
            return Response({'status': 'success', 'message': message, 'data': item})
        except ValueError as exc:
            return error_response(exc)
