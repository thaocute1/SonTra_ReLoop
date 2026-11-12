import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:son_tra_trail_quest/dashboard/pages/safe_trekking_page.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';
import 'package:son_tra_trail_quest/tours/domain/repositories/tour_repository.dart';

void main() {
  testWidgets('shows login error then recovers after retry', (tester) async {
    var calls = 0;
    final repository = _Repository(() async {
      if (calls++ == 0) throw Exception('Vui lòng đăng nhập lại.');
      return [
        Tour.fromJson({'id': 1, 'title': 'Tuyến Sơn Trà'})
      ];
    });
    await tester.pumpWidget(
        MaterialApp(home: SafeTrekkingPage(repository: repository)));
    await tester.pumpAndSettle();
    expect(find.text('Vui lòng đăng nhập lại.'), findsOneWidget);
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.text('Tuyến Sơn Trà'), findsOneWidget);
    expect(find.text('Thử lại'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('refresh waits for the request and handles failure',
      (tester) async {
    var calls = 0;
    final pending = Completer<List<Tour>>();
    final repository = _Repository(() {
      if (calls++ == 0) return Future.value([]);
      return pending.future;
    });
    await tester.pumpWidget(
        MaterialApp(home: SafeTrekkingPage(repository: repository)));
    await tester.pumpAndSettle();
    final indicator =
        tester.widget<RefreshIndicator>(find.byType(RefreshIndicator));
    var finished = false;
    final refresh = indicator.onRefresh().then((_) => finished = true);
    await tester.pump();
    expect(finished, isFalse);
    pending.completeError(Exception('Không kết nối được máy chủ.'));
    await refresh;
    await tester.pumpAndSettle();
    expect(finished, isTrue);
    expect(find.text('Không kết nối được máy chủ.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

class _Repository implements TourRepository {
  _Repository(this.load);
  final Future<List<Tour>> Function() load;

  @override
  Future<List<Tour>> getTours() => load();

  @override
  Future<Tour> getTour(int id) async => (await load()).first;
}
