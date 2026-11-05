class DashboardSummary {
  const DashboardSummary({
    required this.userName,
    required this.completedTrails,
    required this.greenPoints,
    required this.currentStreak,
    required this.nextTrail,
    required this.recentActivities,
  });

  final String userName;
  final int completedTrails;
  final int greenPoints;
  final int currentStreak;
  final String nextTrail;
  final List<String> recentActivities;
}
