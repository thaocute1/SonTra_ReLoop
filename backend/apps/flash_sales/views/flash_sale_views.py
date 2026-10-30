from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.flash_sales.services.flash_sale_service import FlashSaleService


class ActiveFlashSaleSessionView(APIView):
    """
    GET /api/v1/flash-sales/active-session/
    Public API dành cho Du khách xem Phiên Giờ Vàng Flash Sale hiện tại
    kèm danh mục tour ưu đãi, đồng hồ đếm ngược (Countdown) và số slot còn lại.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = FlashSaleService.get_active_session()
        return Response({
            "status": "success",
            "data": data
        }, status=status.HTTP_200_OK)


class AdminCampaignListView(APIView):
    """
    GET /api/v1/flash-sales/admin/campaigns/
    POST /api/v1/flash-sales/admin/campaigns/
    BQL xem danh sách chiến dịch, các phiên giờ vàng và 4 thẻ chỉ số thống kê.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        overview = FlashSaleService.get_admin_campaigns_overview()
        return Response({
            "status": "success",
            "data": overview
        }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            campaign = FlashSaleService.create_campaign(request.data)
            return Response({
                "status": "success",
                "message": "Đã khởi tạo Chiến dịch kích cầu du lịch sinh thái thành công!",
                "data": campaign
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({
                "status": "error",
                "message": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi tạo chiến dịch: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSessionCreateView(APIView):
    """
    POST /api/v1/flash-sales/admin/sessions/
    BQL thiết lập khung giờ vàng (Flash Sale Session)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            session = FlashSaleService.create_session(request.data)
            return Response({
                "status": "success",
                "message": "Đã thiết lập Phiên Giờ Vàng mới thành công!",
                "data": session
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({
                "status": "error",
                "message": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi tạo phiên: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorCampaignItemRegisterView(APIView):
    """
    POST /api/v1/flash-sales/vendor/register-item/
    Đơn vị lữ hành (Vendor) hoặc BQL đăng ký tour vào phiên Flash Sale
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            item = FlashSaleService.register_tour_item(request.data)
            return Response({
                "status": "success",
                "message": "Đã đăng ký tour tham gia Phiên Giờ Vàng thành công!",
                "data": item
            }, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({
                "status": "error",
                "message": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Lỗi đăng ký tour: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminCampaignItemReviewView(APIView):
    """
    PATCH /api/v1/flash-sales/admin/items/<int:item_id>/review/
    BQL phê duyệt hoặc từ chối tour tham gia phiên Flash Sale
    """
    permission_classes = [permissions.AllowAny]

    def patch(self, request, item_id):
        action = request.data.get('action', 'approve')
        try:
            item = FlashSaleService.review_item(item_id, action)
            msg = "Đã phê duyệt tour tham gia Flash Sale!" if action == 'approve' else "Đã từ chối tour tham gia."
            return Response({
                "status": "success",
                "message": msg,
                "data": item
            }, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({
                "status": "error",
                "message": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)

