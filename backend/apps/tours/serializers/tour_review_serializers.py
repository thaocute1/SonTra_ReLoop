from rest_framework import serializers
from .tour_serializers import TourListSerializer


TOUR_STATUSES = ('draft', 'pending_approval', 'need_info', 'approved', 'rejected', 'published', 'suspended', 'closed')


class TourReviewQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=(*TOUR_STATUSES, 'all'), default='pending_approval')
    search = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')


class AdminTourListSerializer(TourListSerializer):
    vendor_status = serializers.CharField(source='vendor.status', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by_admin.name', read_only=True, default=None)

    class Meta(TourListSerializer.Meta):
        fields = [*TourListSerializer.Meta.fields, 'vendor_status', 'created_at', 'rejection_reason',
                  'approved_at', 'approved_by_name']


class TourReviewInputSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=('approve', 'reject'))
    reason = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['action'] == 'reject' and not attrs['reason']:
            raise serializers.ValidationError({'reason': 'Vui lòng nhập lý do từ chối tour.'})
        return attrs
