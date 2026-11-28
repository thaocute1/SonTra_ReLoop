import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/tours/data/tour_repository.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';
import 'package:son_tra_trail_quest/tours/pages/tour_detail_page.dart';
import 'package:son_tra_trail_quest/tours/pages/tour_map_page.dart';
import 'package:son_tra_trail_quest/tours/pages/tracking_page.dart';

void main() {
  testWidgets('tour browsing opens a map without starting GPS or trekking',
      (tester) async {
    var gpsCalls = 0;
    const channel = MethodChannel('flutter.baseflow.com/geolocator');
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel,
        (_) async {
      gpsCalls++;
      return false;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null));
    final tour = Tour.fromJson({'id': 1, 'title': 'Son Tra'});
    final repository = TourRepositoryImpl(
        client: MockClient((_) async => http.Response(
            '{"data":{"id":1,"title":"Son Tra","checkpoints":[]}}', 200)));
    await tester.pumpWidget(
        MaterialApp(home: TourDetailPage(tour: tour, repository: repository)));
    await tester.pumpAndSettle();
    expect(find.text('Trekking'), findsNothing);
    await tester.ensureVisible(find.text('Xem bản đồ'));
    await tester.tap(find.text('Xem bản đồ'));
    await tester.pumpAndSettle();
    expect(find.byType(TourMapPage), findsOneWidget);
    expect(find.byType(TrackingPage), findsNothing);
    expect(find.text('Bản đồ cung đường'), findsOneWidget);
    expect(find.text('Chưa có tọa độ cung đường.'), findsOneWidget);
    expect(find.text('Tạm dừng'), findsNothing);
    expect(find.text('Kết thúc'), findsNothing);
    expect(find.textContaining('SOS'), findsNothing);
    await tester.pump(const Duration(seconds: 5));
    expect(gpsCalls, 0);
  });
}
