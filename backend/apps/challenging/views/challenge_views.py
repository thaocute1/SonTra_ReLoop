from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db import transaction

from apps.accounts.models.user_models import Users
from apps.gamification.models.gamification_models import PointsLedger
from ..models.challenge_models import Challenges, ChallengeAttempts


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

            reward = challenge.reward_points or 0

            # Write ledger -> Automatically triggers PostgreSQL private.sync_eco_points() to update user.total_eco_points
            PointsLedger.objects.create(
                user=user,
                vendor=None,
                points_change=reward,
                reason=f"Hoàn thành nhiệm vụ: {challenge.title}",
                reference_type="challenge_completion",
                challenge_attempt=attempt
            )

            # Refresh user from database to read updated balance from trigger
            user.refresh_from_db()

            return Response({
                'success': True,
                'message': f'Chúc mừng! Bạn đã hoàn thành "{challenge.title}" và nhận +{reward} RE-Points! 🎉',
                'new_total_points': user.total_eco_points,
                'points_awarded': reward,
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

