from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from ..serializers.community_serializers import (
    PostListSerializer,
    PostCreateSerializer,
    PostCommentSerializer
)
from ..services.community_service import CommunityService


class CommunityPostListView(APIView):
    """
    GET /api/v1/cms-chatbot/community/posts/
    Query params:
    - feed_type: 'all' | 'user' | 'vendor' | 'bql'
    - location: 'Đỉnh Bàn Cờ', 'Bãi Nam'...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        feed_type = request.query_params.get('feed_type', 'all')
        location_tag = request.query_params.get('location', 'all')

        posts = CommunityService.get_feed(feed_type=feed_type, location_tag=location_tag)
        serializer = PostListSerializer(posts, many=True)
        return Response({
            'status': 'success',
            'feed_type': feed_type,
            'count': len(posts),
            'data': serializer.data
        })


class CommunityPostCreateView(APIView):
    """
    POST /api/v1/cms-chatbot/community/posts/
    Tạo bài đăng mới từ User, Vendor, hoặc BQL
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        user = getattr(request, 'user', None)
        new_post = CommunityService.create_post(user, serializer.validated_data)
        return Response({
            'status': 'success',
            'message': 'Đã chia sẻ bài viết thành công lên Cộng Đồng Sơn Trà ReLoop!',
            'data': PostListSerializer(new_post).data
        }, status=status.HTTP_201_CREATED)


class CommunityPostLikeView(APIView):
    """
    POST /api/v1/cms-chatbot/community/posts/<int:post_id>/like/
    Thả tim / bỏ thả tim
    """
    permission_classes = [AllowAny]

    def post(self, request, post_id):
        user_id = getattr(request.user, 'id', None) if getattr(request, 'user', None) else 1
        updated_post = CommunityService.toggle_like(post_id, user_id)
        if not updated_post:
            return Response({
                'status': 'error',
                'message': 'Không tìm thấy bài viết!'
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'status': 'success',
            'data': {
                'post_id': post_id,
                'is_liked': updated_post['is_liked'],
                'likes_count': updated_post['likes_count']
            }
        })


class CommunityPostCommentView(APIView):
    """
    POST /api/v1/cms-chatbot/community/posts/<int:post_id>/comments/
    Thêm bình luận trao đổi
    """
    permission_classes = [AllowAny]

    def post(self, request, post_id):
        content = request.data.get('content', '').strip()
        author_name = request.data.get('author_name', 'Eco-Explorer').strip()

        if not content:
            return Response({
                'status': 'error',
                'message': 'Nội dung bình luận không được để trống!'
            }, status=status.HTTP_400_BAD_REQUEST)

        new_comment = CommunityService.add_comment(post_id, author_name, content)
        if not new_comment:
            return Response({
                'status': 'error',
                'message': 'Không tìm thấy bài viết!'
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'status': 'success',
            'message': 'Đã gửi bình luận thành công!',
            'data': new_comment
        }, status=status.HTTP_201_CREATED)


class CommunityLeaderboardView(APIView):
    """
    GET /api/v1/cms-chatbot/community/leaderboard/
    Bảng xếp hạng Eco-Hero
    """
    permission_classes = [AllowAny]

    def get(self, request):
        leaderboard = CommunityService.get_leaderboard()
        return Response({
            'status': 'success',
            'data': leaderboard
        })


class CommunityEventsView(APIView):
    """
    GET /api/v1/cms-chatbot/community/events/
    POST /api/v1/cms-chatbot/community/events/
    Chiến dịch dọn rác cộng đồng (AD-03)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        events = CommunityService.get_cleanup_events()
        return Response({
            'status': 'success',
            'data': events
        })

    def post(self, request):
        data = request.data
        if not data.get('title') or not data.get('event_date'):
            return Response({
                'status': 'error',
                'message': 'Vui lòng cung cấp tiêu đề và ngày diễn ra sự kiện!'
            }, status=status.HTTP_400_BAD_REQUEST)

        event = CommunityService.add_cleanup_event(data)
        return Response({
            'status': 'success',
            'message': 'Đã khởi tạo sự kiện dọn dẹp cộng đồng thành công!',
            'data': event
        }, status=status.HTTP_201_CREATED)


class CommunityImpactCounterView(APIView):
    """
    GET /api/v1/cms-chatbot/community/impact-counter/
    Đồng hồ tác động sinh thái toàn bán đảo
    """
    permission_classes = [AllowAny]

    def get(self, request):
        impact = CommunityService.get_impact_counter()
        return Response({
            'status': 'success',
            'data': impact
        })


class IncidentReportCreateView(APIView):
    """
    GET /api/v1/cms-chatbot/community/incidents/
    POST /api/v1/cms-chatbot/community/incidents/
    Báo cáo sự cố môi trường (KH-12)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = getattr(request, 'user', None)
        incidents = CommunityService.get_incidents(user)
        return Response({
            'status': 'success',
            'count': len(incidents),
            'data': incidents
        }, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        if not data.get('incident_type') or not data.get('description'):
            return Response({
                'status': 'error',
                'message': 'Vui lòng chọn loại sự cố và nhập mô tả chi tiết!'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = getattr(request, 'user', None)
        incident = CommunityService.report_incident(user, data)
        return Response({
            'status': 'success',
            'message': f"Đã gửi báo cáo sự cố thành công! Mã tiếp nhận: #{incident['id']}. Ban Quản Lý Sơn Trà sẽ tiến hành xác minh và xử lý.",
            'data': incident
        }, status=status.HTTP_201_CREATED)



class NotificationListView(APIView):
    """
    GET /api/v1/cms-chatbot/community/notifications/
    Lấy danh sách thông báo hoạt động thời gian thực từ Database
    Query params:
    - role: 'customer' | 'vendor' | 'admin'
    """
    permission_classes = [AllowAny]

    def get(self, request):
        role = request.query_params.get('role', 'customer')
        user = getattr(request, 'user', None)
        notifications = CommunityService.get_notifications(role=role, user=user)
        unread_count = sum(1 for n in notifications if n.get('is_unread', False))

        return Response({
            'status': 'success',
            'role': role,
            'count': len(notifications),
            'unread_count': unread_count,
            'data': notifications
        }, status=status.HTTP_200_OK)


class AdminPostListView(APIView):
    """
    GET /api/v1/cms-chatbot/community/admin/posts/
    BQL xem danh sách tất cả bài viết phục vụ kiểm duyệt
    Query params:
    - status: 'all' | 'draft' | 'published' | 'archived'
    - search: từ khóa tìm kiếm
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status_param = request.query_params.get('status', 'all')
        search_param = request.query_params.get('search', '')

        result = CommunityService.get_admin_posts(status=status_param, search=search_param)
        return Response({
            'status': 'success',
            'metrics': result['metrics'],
            'count': len(result['posts']),
            'data': result['posts']
        }, status=status.HTTP_200_OK)


class AdminPostReviewView(APIView):
    """
    PATCH /api/v1/cms-chatbot/community/admin/posts/<int:post_id>/review/
    BQL thực hiện hành động kiểm duyệt:
    Payload:
    - action: 'approve' | 'reject' | 'restore'
    - rejection_reason: string (lý do từ chối nếu reject)
    """
    permission_classes = [AllowAny]

    def patch(self, request, post_id):
        action = request.data.get('action')
        rejection_reason = request.data.get('rejection_reason', '')
        user = getattr(request, 'user', None)

        if not action or action not in ['approve', 'reject', 'restore']:
            return Response({
                'status': 'error',
                'message': 'Vui lòng cung cấp hành động kiểm duyệt hợp lệ (approve, reject, restore).'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = CommunityService.review_post(
                post_id=post_id,
                action=action,
                rejection_reason=rejection_reason,
                admin_user=user
            )
            return Response({
                'status': 'success',
                'data': res
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f"Lỗi hệ thống khi kiểm duyệt bài viết: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
