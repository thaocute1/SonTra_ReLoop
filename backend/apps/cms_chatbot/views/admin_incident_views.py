import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.accounts.models.user_models import Users
from apps.gamification.models.gamification_models import Feedbacks

class AdminIncidentListView(APIView):
    """
    GET /api/v1/cms-chatbot/incidents/admin/
    AD-08: Tiếp nhận & Quản lý toàn bộ danh sách báo cáo sự cố thực địa trực tiếp từ DB
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status_filter = request.query_params.get('status', 'all')
        type_filter = request.query_params.get('type', 'all')

        qs = Feedbacks.objects.filter(
            feedback_type__in=['environmental_issue', 'safety_violation'],
            target_type='admin_bql'
        ).select_related('customer', 'handled_by_staff').order_by('-created_at')

        incidents = []
        for fb in qs:
            st = fb.status
            mapped_status = 'resolved' if st == 'resolved' else ('in_progress' if st == 'in_investigation' else 'pending')
            status_label = 'Chờ BQL tiếp nhận' if st == 'pending' else ('Đang xử lý thực địa' if st == 'in_investigation' else 'Đã giải quyết')
            
            severity = 'urgent' if 'sạt lở' in fb.title.lower() or 'quấy rối' in fb.title.lower() else (
                'low' if 'thùng rác' in fb.title.lower() else 'medium'
            )
            severity_label = 'Khẩn cấp' if severity == 'urgent' else ('Thấp' if severity == 'low' else 'Trung bình')

            images_list = fb.images if isinstance(fb.images, list) else []
            photo = images_list[0] if images_list else "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"

            incidents.append({
                "id": f"INC-{fb.id}",
                "reporter_name": fb.customer.name if fb.customer else "Du khách",
                "reporter_phone": fb.customer.phone or "0912345678" if fb.customer else "0912345678",
                "incident_type": fb.title,
                "severity": severity,
                "severity_label": severity_label,
                "location_name": "Bán đảo Sơn Trà",
                "coordinates": [16.1154, 108.2690],
                "description": fb.content,
                "photo_url": photo,
                "status": mapped_status,
                "status_label": status_label,
                "assigned_staff": fb.handled_by_staff.name if fb.handled_by_staff else "Chưa phân công",
                "points_awarded": 50 if st == 'resolved' else 0,
                "created_at": fb.created_at.strftime('%d/%m/%Y %H:%M') if fb.created_at else "Hôm nay"
            })

        filtered = incidents
        if status_filter != 'all':
            filtered = [inc for inc in filtered if inc.get('status') == status_filter]
        if type_filter != 'all':
            filtered = [inc for inc in filtered if inc.get('incident_type') == type_filter]

        return Response({
            'count': len(filtered),
            'total_incidents': len(incidents),
            'pending_count': len([i for i in incidents if i.get('status') == 'pending']),
            'in_progress_count': len([i for i in incidents if i.get('status') == 'in_progress']),
            'resolved_count': len([i for i in incidents if i.get('status') == 'resolved']),
            'results': filtered
        }, status=status.HTTP_200_OK)


class AdminIncidentUpdateView(APIView):
    """
    PATCH /api/v1/cms-chatbot/incidents/admin/<str:incident_id>/
    AD-08: Cập nhật trạng thái xử lý, phân công cán bộ BQL vào DB PostgreSQL
    """
    permission_classes = [AllowAny]

    def patch(self, request, incident_id):
        # Extract numeric id from INC-123 or raw number
        nums = re.findall(r'\d+', str(incident_id))
        if not nums:
            return Response({'error': f'Mã sự cố không hợp lệ: {incident_id}'}, status=status.HTTP_400_BAD_REQUEST)

        fb_id = int(nums[0])
        try:
            fb = Feedbacks.objects.get(id=fb_id)
        except Feedbacks.DoesNotExist:
            return Response({'error': f'Không tìm thấy sự cố #{fb_id} trong cơ sở dữ liệu'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        new_status = data.get('status')
        assigned_staff_name = data.get('assigned_staff')
        resolution_notes = data.get('resolution_notes')

        if new_status:
            # Map 'in_progress' to DB enum 'in_investigation'
            db_status = 'in_investigation' if new_status == 'in_progress' else (
                'resolved' if new_status == 'resolved' else 'pending'
            )
            fb.status = db_status

        if resolution_notes:
            fb.resolution_notes = resolution_notes

        if assigned_staff_name:
            staff_user = Users.objects.filter(role__in=['staff', 'system_admin']).first()
            if staff_user:
                fb.handled_by_staff = staff_user

        fb.save()

        return Response({
            'success': True,
            'message': f'Đã cập nhật sự cố {incident_id} thành công vào Database!',
            'data': {
                'id': incident_id,
                'status': new_status,
                'resolution_notes': fb.resolution_notes
            }
        }, status=status.HTTP_200_OK)

    def delete(self, request, incident_id):
        """
        DELETE /api/v1/cms-chatbot/incidents/admin/<str:incident_id>/
        Xóa sự cố khỏi Database
        """
        nums = re.findall(r'\d+', str(incident_id))
        if not nums:
            return Response({'error': f'Mã sự cố không hợp lệ: {incident_id}'}, status=status.HTTP_400_BAD_REQUEST)

        fb_id = int(nums[0])
        try:
            fb = Feedbacks.objects.get(id=fb_id)
            fb.delete()
            return Response({
                'success': True,
                'message': f'Đã xóa sự cố #{fb_id} thành công khỏi Database!'
            }, status=status.HTTP_200_OK)
        except Feedbacks.DoesNotExist:
            return Response({'error': f'Không tìm thấy sự cố #{fb_id} trong cơ sở dữ liệu'}, status=status.HTTP_404_NOT_FOUND)

