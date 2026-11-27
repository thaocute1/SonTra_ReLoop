import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/profile/data/profile_repository.dart';
import 'package:son_tra_trail_quest/profile/pages/profile_history_page.dart';
import 'package:son_tra_trail_quest/profile/pages/refund_request_page.dart';

void main() {
  testWidgets('paid VNPay booking sends a request and shows it awaiting admin',
      (tester) async {
    var requested = false;
    final repository = ProfileRepository(client: MockClient((request) async {
      if (request.method == 'POST') {
        expect(
            request.url.path, '/api/v1/tours/my-bookings/12/refund-request/');
        expect(jsonDecode(request.body), {'reason': 'Đổi lịch'});
        requested = true;
        return http.Response('{"status":"success"}', 200);
      }
      return http.Response.bytes(
          utf8.encode(jsonEncode({
            'data': [
              {
                'id': 12,
                'order_id': 41,
                'order_code': 'TOUR-41',
                'status': 'confirmed',
                'payment_method': 'vnpay',
                'payment_status': 'paid',
                'refund_status': requested ? 'requested' : 'none',
                'refund_status_label':
                    requested ? 'Chờ duyệt hoàn tiền' : 'Không có'
              },
              {
                'id': 13,
                'status': 'waiting_payment',
                'payment_status': 'pending'
              },
            ]
          })),
          200);
    }));

    await tester.pumpWidget(
        MaterialApp(home: ProfileHistoryPage(repository: repository)));
    await tester.pumpAndSettle();
    final refund = find.widgetWithText(OutlinedButton, 'Yêu cầu hoàn tiền');
    expect(refund, findsOneWidget);
    await tester.tap(refund);
    await tester.pumpAndSettle();
    expect(find.text('Số tài khoản'), findsNothing);
    await tester.enterText(find.byType(TextFormField), 'Đổi lịch');
    await tester.tap(find.text('Gửi yêu cầu hoàn tiền'));
    await tester.pumpAndSettle();
    expect(find.text('Chờ duyệt hoàn tiền'), findsOneWidget);
    expect(refund, findsNothing);
  });

  testWidgets('PayOS refund requires the destination bank account',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: RefundRequestPage(
      repository: ProfileRepository(),
      bookingId: 12,
      orderCode: 'TOUR-41',
      gateway: 'payos',
    )));
    expect(find.text('Ngân hàng nhận tiền'), findsOneWidget);
    expect(find.text('Số tài khoản'), findsOneWidget);
    await tester.ensureVisible(find.text('Gửi yêu cầu hoàn tiền'));
    await tester.tap(find.text('Gửi yêu cầu hoàn tiền'));
    await tester.pumpAndSettle();
    expect(find.text('Vui lòng điền thông tin này.'), findsWidgets);
  });
}
