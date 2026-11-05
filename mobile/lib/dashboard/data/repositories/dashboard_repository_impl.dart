import '../../domain/entities/dashboard_summary.dart';

class DashboardRepositoryImpl {
  const DashboardRepositoryImpl({this.userName});

  final String? userName;

  DashboardSummary getSummary() {
    return DashboardSummary(
      userName: userName ?? 'Bạn',
      completedTrails: 12,
      greenPoints: 860,
      currentStreak: 5,
      nextTrail: 'Đỉnh Bàn Cờ',
      recentActivities: [
        'Hoàn thành thử thách Nhặt rác ven biển',
        'Đổi 120 điểm xanh lấy huy hiệu',
        'Lưu cung đường Suối Đá vào yêu thích',
      ],
    );
  }
}
