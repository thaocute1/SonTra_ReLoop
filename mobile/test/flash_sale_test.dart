import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/booking/data/booking_repository.dart';
import 'package:son_tra_trail_quest/booking/pages/booking_page.dart';
import 'package:son_tra_trail_quest/flash_sales/data/flash_sale_repository.dart';
import 'package:son_tra_trail_quest/flash_sales/domain/entities/flash_sale.dart';
import 'package:son_tra_trail_quest/flash_sales/pages/flash_sale_page.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';
import 'package:son_tra_trail_quest/tours/domain/repositories/tour_repository.dart';

const offer = {
  'id': 9,
  'tour_id': 16,
  'tour_title': 'Tour Sơn Trà',
  'promo_price': '299000.99',
  'original_price': '450000.00',
  'discount_percent': 34,
  'remaining_slots': 2,
};

final tour = Tour.fromJson({
  'id': 16,
  'price': 450000,
  'schedules': [
    {'id': '12', 'status': 'open', 'remaining_slots': 4, 'price': 450000},
  ],
});

http.Response jsonResponse(Map<String, dynamic> data) =>
    http.Response.bytes(utf8.encode(jsonEncode(data)), 200,
        headers: {'content-type': 'application/json; charset=utf-8'});

class TestTours implements TourRepository {
  @override
  Future<Tour> getTour(int id) async {
    expect(id, 16);
    return tour;
  }

  @override
  Future<List<Tour>> getTours() async => [tour];
}

FlashSaleRepository repository({required bool live}) => FlashSaleRepository(
      client: MockClient((request) async {
        expect(request.url.path, '/api/v1/flash-sales/active-session/');
        return jsonResponse({
          'data': {
            'has_session': true,
            'session': {
              'is_live': live,
              'time_remaining_seconds': 600,
              'items': [
                offer,
                {...offer, 'id': 10, 'remaining_slots': 0}
              ],
            }
          }
        });
      }),
    );

void main() {
  testWidgets(
      'live offer opens booking with the backend campaign item and promo price',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
        home: FlashSalePage(
            repository: repository(live: true), tours: TestTours())));
    await tester.pumpAndSettle();
    expect(find.text('Tour Sơn Trà'), findsWidgets);
    final soldOut = tester
        .widget<FilledButton>(find.widgetWithText(FilledButton, 'Hết suất'));
    expect(soldOut.onPressed, isNull);
    await tester.tap(find.text('Đặt ngay'));
    await tester.pumpAndSettle();
    final booking = tester.widget<BookingPage>(find.byType(BookingPage));
    expect(booking.flashSaleItem?.id, 9);
    expect(booking.flashSaleItem?.promoPrice, 299000);
  });

  testWidgets('upcoming offer cannot be booked', (tester) async {
    await tester.pumpWidget(
        MaterialApp(home: FlashSalePage(repository: repository(live: false))));
    await tester.pumpAndSettle();
    final upcoming = tester
        .widget<FilledButton>(find.widgetWithText(FilledButton, 'Sắp mở'));
    expect(upcoming.onPressed, isNull);
  });

  testWidgets('live session shows its status and reloads newly approved offers',
      (tester) async {
    var requests = 0;
    final repo = FlashSaleRepository(client: MockClient((_) async {
      requests++;
      return jsonResponse({
        'data': {
          'has_session': true,
          'session_type': 'live',
          'session': {
            'is_live': true,
            'time_remaining_seconds': 600,
            'items': requests == 1 ? [] : [offer],
          },
        },
      });
    }));
    await tester.pumpWidget(MaterialApp(home: FlashSalePage(repository: repo)));
    await tester.pumpAndSettle();
    expect(find.text('Đang diễn ra'), findsOneWidget);
    expect(
        find.text('Phiên này chưa có tour ưu đãi được duyệt.'), findsOneWidget);
    expect(find.text('Đặt ngay'), findsNothing);

    await tester.tap(find.text('Tải lại'));
    await tester.pumpAndSettle();
    expect(requests, 2);
    expect(find.text('Tour Sơn Trà'), findsOneWidget);
    expect(find.text('Đặt ngay'), findsOneWidget);
  });

  testWidgets('booking submits campaign item ID and shows the promo total',
      (tester) async {
    Map<String, dynamic>? submitted;
    final bookingRepo = BookingRepository(client: MockClient((request) async {
      submitted = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response('{"message":"Test stops before payment"}', 400);
    }));
    await tester.pumpWidget(MaterialApp(
        home: BookingPage(
            tour: tour,
            flashSaleItem: FlashSaleItem.fromJson(offer),
            repository: bookingRepo)));
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Khach Test');
    await tester.enterText(fields.at(1), '0901234567');
    final submit = find.text('Tiếp tục thanh toán');
    await tester.scrollUntilVisible(submit, 120,
        scrollable: find
            .descendant(
                of: find.byType(ListView), matching: find.byType(Scrollable))
            .first);
    expect(find.text('Tổng thanh toán: 299.000 đ'), findsOneWidget);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(submitted?['campaign_item_id'], 9);
    expect(submitted?['schedule_id'], '12');
  });
}
