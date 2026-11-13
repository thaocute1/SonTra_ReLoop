import 'dart:math' as math;

typedef Json = Map<String, dynamic>;

List<Json> records(dynamic value) => value is List
    ? value.whereType<Map>().map((v) => Map<String, dynamic>.from(v)).toList()
    : [];
int integer(dynamic value) => int.tryParse('$value') ?? 0;
String text(dynamic value) => value == null ? '' : '$value';

const tripLabels = {
  'open': 'Sắp diễn ra',
  'almost_full': 'Sắp diễn ra',
  'full': 'Đã đủ chỗ',
  'in_progress': 'Đang đi',
  'completed': 'Đã kết thúc',
  'cancelled': 'Đã hủy',
  'canceled': 'Đã hủy',
};
const attendanceLabels = {
  'present': 'Có mặt',
  'absent': 'Vắng',
  'late': 'Đến trễ',
  'cancelled': 'Hủy tham gia',
  'left_group': 'Rời đoàn / cần hỗ trợ',
  'returned': 'Đã về',
  'early_return': 'Về sớm / đã bàn giao',
};
const supportLabels = {
  'received': 'Hệ thống đã nhận',
  'acknowledged': 'Hướng dẫn viên đã nhận',
  'resolved': 'Đã xử lý',
};

class Trip {
  Trip(this.json);
  final Json json;
  int get id => integer(json['id']);
  String get title => text(json['tour_title']);
  String get status => text(json['status']);
  bool get active => status == 'in_progress';
  bool get closed => ['completed', 'cancelled', 'canceled'].contains(status);
  String get label => tripLabels[status] ?? status;
  String get date => text(json['departure_date']);
  String get time => '${text(json['start_time'])} – ${text(json['end_time'])}';
}

class Participant {
  Participant(this.json);
  final Json json;
  int get id => integer(json['id']);
  String get name => text(json['full_name']).isEmpty
      ? 'Thành viên #$id'
      : text(json['full_name']);
  List<Json> get logs => records(json['attendance_logs']);
  Json? get latest => json['latest_attendance'] is Map
      ? Map<String, dynamic>.from(json['latest_attendance'])
      : null;
  String get status => text(latest?['status']);
  String get label => attendanceLabels[status] ?? 'Chưa điểm danh';
  bool get resolved =>
      (latest?['stage'] == 'departure' &&
          ['absent', 'cancelled'].contains(status)) ||
      (latest?['stage'] == 'return' &&
          ['returned', 'early_return'].contains(status));
  bool atCheckpoint(int id) => logs.any(
      (l) => integer(l['checkpoint_id']) == id && l['status'] == 'present');
}

class TripDetail {
  TripDetail(this.json, {this.cached = false});
  final Json json;
  final bool cached;
  Trip get trip => Trip(Map<String, dynamic>.from(json['schedule']));
  List<Participant> get participants =>
      records(json['participants']).map(Participant.new).toList();
  Json get route =>
      json['route'] is Map ? Map<String, dynamic>.from(json['route']) : {};
  List<Json> get checkpoints => records(route['checkpoints'])
    ..sort((a, b) =>
        integer(a['order_index']).compareTo(integer(b['order_index'])));
  List<Json> get events => records(json['events']);
  List<Json> get positions => records(json['positions']);

  List<Json> separationAlerts(double thresholdMeters, {DateTime? now}) {
    if (cached || !trip.active) return [];
    final instant = (now ?? DateTime.now()).toUtc();
    final fresh = positions.where((p) {
      final data = p['payload'] as Map;
      final captured = DateTime.tryParse(text(data['captured_at']));
      final accuracy =
          double.tryParse(text(data['accuracy'])) ?? double.infinity;
      return captured != null &&
          instant.difference(captured).inSeconds.abs() <= 120 &&
          accuracy <= 100;
    }).toList();
    final alerts = <Json>[];
    if (fresh.length < 2) return alerts;
    for (final fix in fresh) {
      double nearest = double.infinity;
      for (final other in fresh) {
        if (identical(fix, other)) continue;
        nearest =
            math.min(nearest, _distance(fix['payload'], other['payload']));
      }
      if (nearest > thresholdMeters) {
        alerts.add({'user_id': fix['user_id'], 'distance_m': nearest.round()});
      }
    }
    return alerts;
  }
}

double _distance(Map a, Map b) {
  double rad(dynamic value) => double.parse('$value') * math.pi / 180;
  final lat1 = rad(a['latitude']), lat2 = rad(b['latitude']);
  final deltaLat = lat2 - lat1,
      deltaLon = rad(b['longitude']) - rad(a['longitude']);
  final h = math.pow(math.sin(deltaLat / 2), 2) +
      math.cos(lat1) * math.cos(lat2) * math.pow(math.sin(deltaLon / 2), 2);
  return 6371000 *
      2 *
      math.atan2(math.sqrt(h.clamp(0, 1)), math.sqrt((1 - h).clamp(0, 1)));
}
