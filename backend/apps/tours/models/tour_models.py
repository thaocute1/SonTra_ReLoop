from django.db import models
from apps.vendors.models import Vendors
from apps.accounts.models import Users

class Tours(models.Model):
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    title = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    cover_image_url = models.TextField(blank=True, null=True)
    images = models.JSONField(default=list)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    max_capacity = models.IntegerField(default=20)
    difficulty_level = models.CharField(max_length=50, default='moderate')
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    cancellation_policy = models.JSONField(blank=True, null=True)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='draft')
    rejection_reason = models.TextField(blank=True, null=True)
    suspended_reason = models.TextField(blank=True, null=True)
    approved_by_admin = models.ForeignKey(Users, models.DO_NOTHING, related_name='approved_tours', blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    suspended_by_admin = models.ForeignKey(Users, models.DO_NOTHING, related_name='suspended_tours', blank=True, null=True)
    suspended_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tours'

    def __str__(self):
        return self.title


class Routes(models.Model):
    id = models.BigAutoField(primary_key=True)
    tour = models.OneToOneField(Tours, models.DO_NOTHING)
    start_latitude = models.DecimalField(max_digits=10, decimal_places=8)
    start_longitude = models.DecimalField(max_digits=11, decimal_places=8)
    end_latitude = models.DecimalField(max_digits=10, decimal_places=8)
    end_longitude = models.DecimalField(max_digits=11, decimal_places=8)
    total_distance_km = models.DecimalField(max_digits=5, decimal_places=2)
    elevation_gain_m = models.IntegerField(blank=True, null=True)
    gpx_file_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'routes'


class Checkpoints(models.Model):
    id = models.BigAutoField(primary_key=True)
    route = models.ForeignKey(Routes, models.DO_NOTHING, related_name='checkpoints')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    radius_tolerance_m = models.IntegerField(default=30)
    min_dwell_seconds = models.IntegerField(default=0)
    order_index = models.IntegerField()
    is_mandatory = models.BooleanField(default=True)
    require_photo = models.BooleanField(default=False)
    is_final = models.BooleanField(default=False)
    status = models.CharField(max_length=50, default='pending')
    admin_feedback = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'checkpoints'
        unique_together = (('route', 'order_index'),)

    def __str__(self):
        return f"{self.order_index}. {self.name}"


class Products(models.Model):
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey(Vendors, models.DO_NOTHING)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    origin = models.CharField(max_length=255, blank=True, null=True)
    material = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    images = models.JSONField(default=list)
    qr_code_url = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='pending_approval')
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'products'

    def __str__(self):
        return self.name


class TourSchedules(models.Model):
    id = models.BigAutoField(primary_key=True)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, related_name='schedules')
    guide = models.ForeignKey('vendors.Guides', models.DO_NOTHING, blank=True, null=True)
    departure_date = models.DateField()
    start_time = models.TimeField(default='06:00:00')
    end_time = models.TimeField(default='10:30:00')
    max_capacity = models.IntegerField(default=15)
    booked_count = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=50, default='open')  # open, almost_full, full, in_progress, completed, cancelled
    special_notes = models.TextField(blank=True, null=True)
    actual_started_at = models.DateTimeField(blank=True, null=True)
    actual_ended_at = models.DateTimeField(blank=True, null=True)
    trip_report = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tour_schedules'

    @property
    def remaining_slots(self):
        return max(0, self.max_capacity - self.booked_count)

    def __str__(self):
        return f"{self.tour.title} ({self.departure_date} {self.start_time})"


class TourParticipants(models.Model):
    id = models.BigAutoField(primary_key=True)
    tour_schedule = models.ForeignKey(TourSchedules, models.DO_NOTHING, related_name='participants')
    order_item = models.ForeignKey('orders.OrderItems', models.DO_NOTHING, related_name='tour_participants')
    participant_no = models.IntegerField()
    full_name = models.TextField(blank=True, null=True)
    phone = models.TextField(blank=True, null=True)
    emergency_contact_name = models.TextField(blank=True, null=True)
    emergency_contact_phone = models.TextField(blank=True, null=True)
    special_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tour_participants'
        unique_together = (('order_item', 'participant_no'),)


class TourAttendanceLogs(models.Model):
    id = models.BigAutoField(primary_key=True)
    participant = models.ForeignKey(TourParticipants, models.DO_NOTHING, related_name='attendance_logs')
    checkpoint = models.ForeignKey(Checkpoints, models.DO_NOTHING, blank=True, null=True)
    attendance_stage = models.CharField(max_length=30)
    participant_status = models.CharField(max_length=30)
    confirmed_by_guide = models.ForeignKey('vendors.Guides', models.DO_NOTHING)
    confirmed_at = models.DateTimeField()
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tour_attendance_logs'
        ordering = ['-confirmed_at']

class TripChatMessages(models.Model):
    id = models.BigAutoField(primary_key=True)
    tour = models.ForeignKey(Tours, models.DO_NOTHING, related_name='chat_messages', db_column='tour_id')
    scheduled_date = models.DateField()
    sender = models.ForeignKey(Users, models.DO_NOTHING, related_name='sent_trip_messages', db_column='sender_id')
    message_type = models.CharField(max_length=50, default='text')  # text, bql_alert, guide_note, sos
    content = models.TextField()
    image_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'trip_chat_messages'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.scheduled_date}] {self.tour.title} - {self.sender.name}: {self.content[:30]}"

