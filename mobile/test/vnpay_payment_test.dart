import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/booking/data/booking_repository.dart';
import 'package:son_tra_trail_quest/booking/domain/entities/booking.dart';
import 'package:son_tra_trail_quest/booking/pages/vnpay_payment_page.dart';

void main() {
  test('booking sends the selected VNPay method and preserves the schedule',
      () async {
    final repository = BookingRepository(client: MockClient((request) async {
      expect(jsonDecode(request.body)['payment_method'], 'vnpay');
      return http.Response('{"data":{"order_id":41,"schedule_id":"3"}}', 201);
    }));
    final booking = await repository.createBooking(const BookingRequest(
      tourId: 1,
      scheduleId: '3',
      adults: 1,
      children: 0,
      name: 'Khách',
      phone: '0901234567',
      email: '',
      pickupLocation: '',
      payment: BookingPayment.vnpay,
    ));
    expect(booking.orderId, 41);
    expect(booking.scheduleId, 3);
  });

  testWidgets('groups are offered after the backend reports the order paid',
      (tester) async {
    var orderStatus = 'pending';
    final repository = BookingRepository(client: MockClient((request) async {
      expect(request.url.path, endsWith('/vnpay/status/41/'));
      return http.Response(
          jsonEncode({
            'data': {
              'order_id': 41,
              'payment_status': 'paid',
              'order_payment_status': orderStatus,
            }
          }),
          200);
    }));
    await tester.pumpWidget(MaterialApp(
        home: VNPayPaymentPage(
      booking: const BookingResult(
          orderId: 41,
          bookingCode: 'TEST',
          total: 50000,
          paymentOrderCode: 0,
          qrCode: '',
          scheduleId: 3),
      repository: repository,
    )));
    final check = find.text('Kiểm tra trạng thái');
    await tester.tap(check);
    await tester.pumpAndSettle();
    expect(find.text('Vào chat đoàn'), findsNothing);

    orderStatus = 'paid';
    await tester.tap(check);
    await tester.pumpAndSettle();
    expect(find.text('Vào chat đoàn'), findsOneWidget);
  });
}
