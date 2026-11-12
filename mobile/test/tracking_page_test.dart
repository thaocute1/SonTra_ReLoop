import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';
import 'package:son_tra_trail_quest/tours/pages/tracking_page.dart';

void main() {
  const channel = MethodChannel('flutter.baseflow.com/geolocator');
  final binding = TestWidgetsFlutterBinding.ensureInitialized();
  final tour = Tour.fromJson({'id': 1, 'title': 'Test tour'});

  tearDown(() {
    binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('GPS disabled still allows pause and finish', (tester) async {
    binding.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (_) async => false);
    await tester.pumpWidget(MaterialApp(home: TrackingPage(tour: tour)));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('GPS đang tắt'), findsOneWidget);
    await tester.tap(find.text('Tạm dừng'));
    await tester.pump();
    expect(find.text('Tiếp tục'), findsOneWidget);
    await tester.tap(find.text('Kết thúc'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Kết thúc hành trình?'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('plugin errors are handled without freezing controls',
      (tester) async {
    binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (_) async {
      throw PlatformException(code: 'LOCATION_ERROR');
    });
    await tester.pumpWidget(MaterialApp(home: TrackingPage(tour: tour)));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Không khởi động được GPS'), findsOneWidget);
    await tester.tap(find.text('Tạm dừng'));
    await tester.pump();
    expect(find.text('Tiếp tục'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('leaving before GPS resolves does not start permission flow',
      (tester) async {
    final pending = Completer<bool>();
    var permissionCalls = 0;
    binding.defaultBinaryMessenger.setMockMethodCallHandler(channel,
        (call) async {
      if (call.method == 'isLocationServiceEnabled') return pending.future;
      permissionCalls++;
      return 0;
    });
    await tester.pumpWidget(MaterialApp(home: TrackingPage(tour: tour)));
    await tester.pumpWidget(const SizedBox());
    pending.complete(true);
    await tester.pump();
    expect(permissionCalls, 0);
    expect(tester.takeException(), isNull);
  });
}
