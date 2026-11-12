import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/booking/data/booking_repository.dart';
import 'package:son_tra_trail_quest/booking/domain/entities/booking.dart';

void main() {
  tearDown(AuthSession.clear);

  test('booking sends API payment code payos with authenticated request',
      () async {
    AuthSession.accessToken = 'session-token';
    final repository = BookingRepository(client: MockClient((request) async {
      expect(request.url.path, '/api/v1/orders/booking/');
      expect(request.headers['Authorization'], 'Bearer session-token');
      final body = jsonDecode(request.body) as Map;
      expect(body['payment_method'], 'payos');
      expect(body['schedule_id'], '12');
      expect(body['adults_count'], 1);
      return http.Response(
          jsonEncode({
            'data': {'order_id': 3, 'order_code': 'TEST', 'grand_total': 2000},
          }),
          201);
    }));
    final result = await repository.createBooking(const BookingRequest(
      tourId: 1,
      scheduleId: '12',
      adults: 1,
      children: 0,
      name: 'Test User',
      phone: '0901234567',
      email: 'test@example.com',
      pickupLocation: 'Da Nang',
    ));
    expect(result.orderId, 3);
    expect(result.total, 2000);
  });
}
