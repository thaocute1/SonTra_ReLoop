from rest_framework import serializers
from ..models.user_models import Users, Staffs

class StaffCreateSerializer(serializers.Serializer):
    employee_code = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100)
    position = serializers.CharField(max_length=100, required=False, allow_blank=True)
    password = serializers.CharField(max_length=128)
    permissions = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate_email(self, value):
        if Users.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email này đã được sử dụng trên hệ thống.")
        return value

    def validate_employee_code(self, value):
        if Staffs.objects.filter(employee_code=value).exists():
            raise serializers.ValidationError("Mã nhân viên này đã tồn tại.")
        return value

    def validate_phone(self, value):
        if value and Users.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Số điện thoại này đã được sử dụng.")
        return value


class StaffListSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    user_status = serializers.CharField(source='user.status', read_only=True)

    class Meta:
        model = Staffs
        fields = [
            'id',
            'user_id',
            'employee_code',
            'name',
            'email',
            'phone',
            'role',
            'department',
            'position',
            'permissions',
            'is_active',
            'user_status',
            'created_at',
            'updated_at'
        ]
