import 'package:flutter_test/flutter_test.dart';

import 'package:son_tra_trail_quest/missions/domain/entities/mission.dart';

void main() {
  test('parses mission progress and reward', () {
    final mission = Mission.fromJson({
      'id': 3,
      'title': 'Thu gom rác tại Bãi Nam',
      'points': 100,
      'status': 'in_progress',
      'progress': 50,
      'tag': 'Nhiệm vụ Xanh',
      'desc': 'Giữ gìn Sơn Trà sạch đẹp.',
    });

    expect(mission.title, 'Thu gom rác tại Bãi Nam');
    expect(mission.points, 100);
    expect(mission.progress, 50);
    expect(mission.isCompleted, isFalse);
  });
}
