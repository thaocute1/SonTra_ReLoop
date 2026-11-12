from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.core.files.storage import default_storage
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt
import os
import uuid

from apps.accounts.models.user_models import Users
from apps.orders.models.order_models import OrderVendors, OrderItems
from apps.gamification.models.gamification_models import Badges
from apps.gamification.models.gamification_models import EcoTrashSubmissions, PointsLedger
from ..models.challenge_models import Challenges, ChallengeAttempts, ChallengeCheckpoints, CheckinLogs


def _distance_metres(lat1, lng1, lat2, lng2):
    """Return the great-circle distance between two GPS positions."""
    lat1, lng1, lat2, lng2 = map(radians, map(float, (lat1, lng1, lat2, lng2)))
    dlat, dlng = lat2 - lat1, lng2 - lng1
    value = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 6371000 * 2 * asin(sqrt(value))


class PublicMissionListView(APIView):
    """
    Public / Authenticated API:
    Lists all active green missions & challenges with user's personal completion status.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        challenges = Challenges.objects.filter(is_active=True, deleted_at__isnull=True, approval_status='approved').order_by('id')
        user = request.user if request.user and request.user.is_authenticated else None

        attempts_map = {}
        if user:
            user_attempts = ChallengeAttempts.objects.filter(customer=user)
            for att in user_attempts:
                attempts_map[att.challenge_id] = att

        results = []
        for c in challenges:
            att = attempts_map.get(c.id)
            is_completed = att.status == 'completed' if att else False
            
            results.append({
                'id': c.id,
                'title': c.title,
                'points': c.reward_points,
                'status': att.status if att else 'available',
                'progress': 100 if is_completed else (50 if att and att.status in ('in_progress', 'pending_review') else 0),
                'mission_type': c.mission_type,
                'scope': c.scope,
                'requires_evidence': c.mission_type == 'eco_action',
                'tour_id': c.tour_id,
                'tag': c.badge_name or 'Nhiệm vụ Xanh',
                'desc': c.description or '',
                'completedDate': att.completed_at.strftime('%d/%m/%Y') if (att and att.completed_at) else None,
                'proofUrl': c.banner_url or c.badge_icon_url or '',
                'badge_name': c.badge_name,
                'badge_icon_url': c.badge_icon_url,
            })

        return Response({
            'count': len(results),
            'results': results
        }, status=status.HTTP_200_OK)


class MissionCompleteView(APIView):
    """
    Protected API:
    Completes a challenge mission, awards RE-Points, updates ChallengeAttempt,
    and logs transparently to PointsLedger within an atomic transaction.
    PostgreSQL trigger private.sync_eco_points() updates users.total_eco_points.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        proof_file = request.FILES.get('proof_file')
        if proof_file:
            if not (proof_file.content_type or '').startswith('image/'):
                return Response({'error': 'Minh chứng phải là tệp ảnh.'}, status=status.HTTP_400_BAD_REQUEST)
            if proof_file.size > 8 * 1024 * 1024:
                return Response({'error': 'Ảnh minh chứng không được vượt quá 8 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = Challenges.objects.get(id=pk, is_active=True, deleted_at__isnull=True, approval_status='approved')
        except Challenges.DoesNotExist:
            return Response({'error': 'Nhiệm vụ không tồn tại hoặc đã đóng.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            user = Users.objects.select_for_update().get(id=request.user.id)
            order_vendor = None
            order_vendor_id = request.data.get('order_vendor_id')
            if challenge.mission_type == 'checkin_gps':
                if not challenge.tour_id or not order_vendor_id:
                    return Response({'error': 'Nhiệm vụ GPS cần booking tour hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
                order_vendor = OrderVendors.objects.filter(
                    id=order_vendor_id, order__customer=user,
                    status__in=['paid', 'confirmed', 'completed']
                ).first()
                if not order_vendor or not OrderItems.objects.filter(order_vendor=order_vendor, tour_id=challenge.tour_id).exists():
                    return Response({'error': 'Booking không thuộc tour của nhiệm vụ.'}, status=status.HTTP_400_BAD_REQUEST)
                attempt, created = ChallengeAttempts.objects.get_or_create(
                    customer=user, challenge=challenge, order_vendor=order_vendor,
                    defaults={'status': 'in_progress', 'started_at': timezone.now(), 'assignment_source': 'self_join'},
                )
            else:
                attempt, created = ChallengeAttempts.objects.get_or_create(
                    customer=user, challenge=challenge, order_vendor__isnull=True,
                    defaults={'status': 'in_progress', 'started_at': timezone.now(), 'assignment_source': 'self_join'},
                )

            if attempt.status == 'completed':
                return Response({
                    'success': False,
                    'message': 'Bạn đã hoàn thành nhiệm vụ này trước đó rồi!',
                    'new_total_points': user.total_eco_points
                }, status=status.HTTP_400_BAD_REQUEST)

            if attempt.status == 'pending_review':
                return Response({'success': False, 'message': 'Minh chứng đang chờ duyệt.'}, status=status.HTTP_409_CONFLICT)

            if order_vendor and attempt.order_vendor_id != order_vendor.id:
                attempt.order_vendor = order_vendor

            if challenge.mission_type == 'eco_action':
                if not proof_file:
                    return Response({'error': 'Nhiệm vụ xanh cần ảnh minh chứng.'}, status=status.HTTP_400_BAD_REQUEST)
                attempt.status = 'pending_review'
                attempt.started_at = attempt.started_at or timezone.now()
                attempt.save(update_fields=['status', 'started_at', 'order_vendor', 'updated_at'])
            else:
                attempt.status = 'completed'
                attempt.completed_at = timezone.now()
                attempt.save(update_fields=['status', 'completed_at', 'order_vendor', 'updated_at'])

            # Persist the optional proof uploaded by the user and connect it to
            # the mission's first checkpoint when GPS data is available.
            latitude = request.data.get('latitude')
            longitude = request.data.get('longitude')
            gps_accuracy = request.data.get('gps_accuracy_m')
            proof_url = ''
            evidence_submission = None
            if proof_file:
                extension = os.path.splitext(proof_file.name)[1].lower()[:10]
                proof_path = default_storage.save(
                    f"mission-proofs/{user.id}/{uuid.uuid4().hex}{extension}",
                    proof_file,
                )
                proof_url = default_storage.url(proof_path)
                reviewer = Users.objects.filter(
                    role__in=['staff', 'system_admin'],
                    status='active',
                    deleted_at__isnull=True,
                ).first() or user
                evidence_submission = EcoTrashSubmissions.objects.create(
                    customer=user,
                    staff=reviewer,
                    total_weight_kg=Decimal('0'),
                    trash_details={
                        'source': 'challenge_completion',
                        'challenge_id': challenge.id,
                        'challenge_title': challenge.title,
                        'note': request.data.get('note', ''),
                        'latitude': latitude,
                        'longitude': longitude,
                        'gps_accuracy_m': gps_accuracy,
                    },
                    evidence_photo_url=proof_url,
                    points_awarded=0,
                    status='pending_review',
                    challenge_attempt=attempt,
                )

            checkpoint_link = ChallengeCheckpoints.objects.filter(
                challenge=challenge,
                is_required=True,
            ).select_related('checkpoint').order_by('order_index').first()
            if checkpoint_link and latitude and longitude:
                checkpoint = checkpoint_link.checkpoint
                distance = _distance_metres(latitude, longitude, checkpoint.latitude, checkpoint.longitude)
                within_radius = distance <= float(checkpoint.radius_tolerance_m or 100)
                review_status = 'auto_approved' if within_radius else 'pending_review'
                CheckinLogs.objects.get_or_create(
                    challenge_attempt=attempt,
                    checkpoint=checkpoint,
                    defaults={
                        'latitude': Decimal(str(latitude)),
                        'longitude': Decimal(str(longitude)),
                        'gps_accuracy_m': Decimal(str(gps_accuracy)) if gps_accuracy else None,
                        'distance_from_checkpoint_m': Decimal(str(round(distance, 2))),
                        'is_mock_location': False,
                        'is_flagged_for_manual_review': not within_radius,
                        'photo_url': proof_url or None,
                        'is_valid': within_radius,
                        'review_status': review_status,
                    },
                )

            if challenge.mission_type == 'checkin_gps':
                required = ChallengeCheckpoints.objects.filter(challenge=challenge, is_required=True).count()
                checked = CheckinLogs.objects.filter(
                    challenge_attempt=attempt,
                    is_valid=True,
                    review_status__in=['auto_approved', 'approved'],
                ).count()
                if required and checked < required:
                    attempt.status = 'in_progress'
                    attempt.completed_at = None
                    attempt.save(update_fields=['status', 'completed_at', 'updated_at'])
                    return Response({'error': 'Chưa hoàn thành đủ checkpoint bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)

            if challenge.mission_type == 'eco_action':
                return Response({'success': True, 'message': 'Đã gửi minh chứng, đang chờ staff duyệt.', 'status': 'pending_review', 'task': {'id': challenge.id, 'status': 'pending_review'}}, status=status.HTTP_202_ACCEPTED)

            reward = challenge.reward_points or 0

            # Write ledger -> Automatically triggers PostgreSQL private.sync_eco_points() to update user.total_eco_points
            PointsLedger.objects.create(
                user=user,
                vendor=None,
                points_change=reward,
                reason=f"Hoàn thành nhiệm vụ: {challenge.title}",
                reference_type="challenge_completion",
                eco_trash_submission=evidence_submission,
                challenge_attempt=attempt
            )

            # Refresh user from database to read updated balance from trigger
            user.refresh_from_db()

            Badges.objects.get_or_create(customer=user, challenge=challenge, defaults={
                'vendor': challenge.vendor, 'badge_name': challenge.badge_name,
                'badge_icon_url': challenge.badge_icon_url, 'badge_description': challenge.badge_description,
            })

            return Response({
                'success': True,
                'message': f'Chúc mừng! Bạn đã hoàn thành "{challenge.title}" và nhận +{reward} RE-Points! 🎉',
                'new_total_points': user.total_eco_points,
                'points_awarded': reward,
                'evidence': {
                    'photo_url': proof_url,
                    'gps_recorded': bool(checkpoint_link and latitude and longitude),
                    'note': request.data.get('note', ''),
                },
                'task': {
                    'id': challenge.id,
                    'title': challenge.title,
                    'points': reward,
                    'status': 'completed',
                    'progress': 100,
                    'tag': challenge.badge_name or 'Nhiệm vụ Xanh',
                    'desc': challenge.description,
                    'completedDate': attempt.completed_at.strftime('%d/%m/%Y'),
                    'proofUrl': challenge.banner_url or challenge.badge_icon_url,
                }
            }, status=status.HTTP_200_OK)


def _staff_or_admin(request):
    return request.user.is_authenticated and request.user.role in ('staff', 'system_admin', 'admin')


class MissionReviewQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _staff_or_admin(request):
            return Response({'detail': 'Bạn không có quyền duyệt minh chứng.'}, status=status.HTTP_403_FORBIDDEN)
        attempts = ChallengeAttempts.objects.filter(status='pending_review').select_related('customer', 'challenge').order_by('assigned_at')
        return Response({'count': attempts.count(), 'results': [{
            'id': a.id, 'challenge_id': a.challenge_id, 'title': a.challenge.title,
            'customer': {'id': a.customer_id, 'name': a.customer.name, 'email': a.customer.email},
            'status': a.status, 'submitted_at': a.updated_at,
            'evidence': next((s.evidence_photo_url for s in a.trash_submissions.all()), None),
        } for a in attempts]})


class MissionReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not _staff_or_admin(request):
            return Response({'detail': 'Bạn không có quyền duyệt minh chứng.'}, status=status.HTTP_403_FORBIDDEN)
        decision = request.data.get('decision')
        if decision not in ('approved', 'rejected'):
            return Response({'error': 'decision phải là approved hoặc rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            attempt = ChallengeAttempts.objects.select_for_update().select_related('challenge', 'customer').get(id=pk, status='pending_review')
            submission = attempt.trash_submissions.select_for_update().first()
            if decision == 'rejected':
                attempt.status = 'rejected'; attempt.save(update_fields=['status', 'updated_at'])
                if submission: submission.status = 'rejected'; submission.rejection_reason = request.data.get('reason', ''); submission.save(update_fields=['status', 'rejection_reason'])
                return Response({'success': True, 'status': 'rejected'})
            attempt.status = 'completed'; attempt.completed_at = timezone.now(); attempt.save(update_fields=['status', 'completed_at', 'updated_at'])
            if submission: submission.status = 'approved'; submission.points_awarded = attempt.challenge.reward_points or 0; submission.save(update_fields=['status', 'points_awarded'])
            if not PointsLedger.objects.filter(challenge_attempt=attempt).exists():
                PointsLedger.objects.create(user=attempt.customer, points_change=attempt.challenge.reward_points or 0, reason=f'Hoàn thành nhiệm vụ: {attempt.challenge.title}', reference_type='challenge_completion', challenge_attempt=attempt, eco_trash_submission=submission)
            Badges.objects.get_or_create(customer=attempt.customer, challenge=attempt.challenge, defaults={'vendor': attempt.challenge.vendor, 'badge_name': attempt.challenge.badge_name, 'badge_icon_url': attempt.challenge.badge_icon_url, 'badge_description': attempt.challenge.badge_description})
            attempt.customer.refresh_from_db()
            return Response({'success': True, 'status': 'completed', 'new_total_points': attempt.customer.total_eco_points})

