from rest_framework import serializers
from apps.cms_chatbot.models.cms_models import Posts
from apps.accounts.models import Users


class PostCommentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    post_id = serializers.IntegerField(required=False)
    author_name = serializers.CharField(read_only=True)
    author_initials = serializers.CharField(read_only=True)
    content = serializers.CharField()
    created_at = serializers.CharField(read_only=True)


class PostListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    author_id = serializers.IntegerField(required=False)
    author_name = serializers.CharField()
    author_initials = serializers.CharField()
    author_role = serializers.CharField(default='tourist') # 'tourist' | 'vendor' | 'admin'
    role_badge = serializers.CharField(required=False)
    
    post_type = serializers.CharField() # 'user_story' | 'vendor_promo' | 'bql_alert' | 'cleanup_event'
    title = serializers.CharField(required=False, allow_blank=True)
    content = serializers.CharField()
    thumbnail_url = serializers.CharField(required=False, allow_blank=True)
    collected_kg = serializers.FloatField(required=False, default=0.0)
    location_tag = serializers.CharField(required=False, default='Bán đảo Sơn Trà')
    points_reward = serializers.CharField(required=False, allow_blank=True)
    
    # Dành cho bài đăng Vendor
    tour_id = serializers.IntegerField(required=False, allow_null=True)
    tour_title = serializers.CharField(required=False, allow_blank=True)
    tour_price = serializers.CharField(required=False, allow_blank=True)
    
    # Dành cho bài đăng BQL
    is_pinned = serializers.BooleanField(default=False)
    alert_level = serializers.CharField(required=False, default='info') # 'danger' | 'warning' | 'info' | 'success'
    
    # Tương tác
    likes_count = serializers.IntegerField(default=0)
    is_liked = serializers.BooleanField(default=False)
    comments_count = serializers.IntegerField(default=0)
    comments = PostCommentSerializer(many=True, required=False, default=list)
    
    status = serializers.CharField(required=False, default='published')
    status_label = serializers.CharField(required=False, default='Đã xuất bản')
    is_pending = serializers.BooleanField(required=False, default=False)
    created_at = serializers.CharField()
    time_ago = serializers.CharField(required=False)


class PostCreateSerializer(serializers.Serializer):
    post_type = serializers.ChoiceField(
        choices=['user_story', 'vendor_promo', 'bql_alert', 'cleanup_event'],
        default='user_story'
    )
    title = serializers.CharField(required=False, allow_blank=True, default='')
    content = serializers.CharField()
    thumbnail_url = serializers.CharField(required=False, allow_blank=True, default='')
    collected_kg = serializers.FloatField(required=False, default=0.0)
    location_tag = serializers.CharField(required=False, default='Bán đảo Sơn Trà')
    tour_id = serializers.IntegerField(required=False, allow_null=True)
    is_pinned = serializers.BooleanField(required=False, default=False)
    alert_level = serializers.CharField(required=False, default='info')

