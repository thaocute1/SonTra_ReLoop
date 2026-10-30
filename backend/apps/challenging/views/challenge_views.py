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
        challenges = Challenges.objects.filter(is_active=True, deleted_at__isnull=True).order_by('id')
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
                'status': 'completed' if is_completed else ('in_progress' if att else 'in_progress'),
                'progress': 100 if is_completed else (50 if att else 0),
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
            challenge = Challenges.objects.get(id=pk, is_active=True, deleted_at__isnull=True)
        except Challenges.DoesNotExist:
            return Response({'error': 'Nhiệm vụ không tồn tại hoặc đã đóng.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            user = Users.objects.select_for_update().get(id=request.user.id)
            attempt, created = ChallengeAttempts.objects.get_or_create(
                customer=user,
                challenge=challenge,
                defaults={'status': 'in_progress'}
            )

            if attempt.status == 'completed':
                return Response({
                    'success': False,
                    'message': 'Bạn đã hoàn thành nhiệm vụ này trước đó rồi!',
                    'new_total_points': user.total_eco_points
                }, status=status.HTTP_400_BAD_REQUEST)

            # Mark attempt completed
            attempt.status = 'completed'
            attempt.completed_at = timezone.now()
            attempt.save(update_fields=['status', 'completed_at', 'updated_at'])

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
                    points_awarded=challenge.reward_points or 0,
                )

            checkpoint_link = ChallengeCheckpoints.objects.filter(
                challenge=challenge,
                is_required=True,
            ).select_related('checkpoint').order_by('order_index').first()
            if checkpoint_link and latitude and longitude:
                checkpoint = checkpoint_link.checkpoint
                distance = _distance_metres(latitude, longitude, checkpoint.latitude, checkpoint.longitude)
                CheckinLogs.objects.create(
                    challenge_attempt=attempt,
                    checkpoint=checkpoint,
                    latitude=Decimal(str(latitude)),
                    longitude=Decimal(str(longitude)),
                    gps_accuracy_m=Decimal(str(gps_accuracy)) if gps_accuracy else None,
                    distance_from_checkpoint_m=Decimal(str(round(distance, 2))),
                    is_mock_location=False,
                    is_flagged_for_manual_review=distance > float(checkpoint.radius_tolerance_m or 100),
                    photo_url=proof_url or None,
                    is_valid=distance <= float(checkpoint.radius_tolerance_m or 100),
                )

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

