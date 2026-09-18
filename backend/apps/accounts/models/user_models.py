from django.db import models

class Users(models.Model):
    id = models.BigAutoField(primary_key=True)
    auth_id = models.UUIDField(unique=True, blank=True, null=True)
    name = models.CharField(max_length=255)
    email = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, unique=True, blank=True, null=True)
    avatar_url = models.TextField(blank=True, null=True)
    qr_token = models.CharField(max_length=255, unique=True, blank=True, null=True)
    total_eco_points = models.IntegerField(default=0)
    role = models.CharField(max_length=50, default='customer')
    status = models.CharField(max_length=50, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'

    def __str__(self):
        return f"{self.name} ({self.role})"


class Staffs(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(Users, models.DO_NOTHING)
    employee_code = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100, blank=True, null=True)
    permissions = models.JSONField(default=list)
    created_by_admin = models.ForeignKey(Users, models.DO_NOTHING, related_name='created_staffs')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'staffs'

    def __str__(self):
        return f"{self.employee_code} - {self.department}"
