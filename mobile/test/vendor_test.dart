import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/vendor/data/vendor_repository_impl.dart';
import 'package:son_tra_trail_quest/vendor/domain/vendor_repository.dart';
import 'package:son_tra_trail_quest/vendor/pages/vendor_portal_page.dart';

class FakeVendorRepository implements VendorRepository {
  final calls = <String>[];
  @override
  void close() {}
  @override
  Future<dynamic> request(String path,
      {String method = 'GET',
      VendorRecord? body,
      Map<String, String>? query}) async {
    calls.add('$method $path');
    if (path == 'vendors/dashboard/') {
      return {
        'vendor_info': {'brand_name': 'Sơn Trà Travel'},
        'metrics': {'monthly_revenue': 1000000, 'total_bookings': 4},
        'reconciliation': {
          'summary': {'vendor_net_amount': 850000}
        }
      };
    }
    if (path == 'vendors/bookings/') {
      return {
        'bookings': [
          {
            'id': '42',
            'order_code': 'ORD-42',
            'customer_name': 'Lan',
            'experience_name': 'Bàn Cờ',
            'booking_date_formatted': '29/11/2026',
            'time_slot': '06:00 - 10:30',
            'guests_label': '2 người lớn',
            'total_price_formatted': '900.000 đ',
            'status_label': 'Chờ xác nhận',
            'payment_status_label': 'Đã thanh toán'
          }
        ]
      };
    }
    return {};
  }
}

void main() {
  tearDown(AuthSession.clear);
  test('expired vendor JWT is refreshed and original request retried once', () async {
    AuthSession.userRole = 'vendor_admin';
    AuthSession.accessToken = 'old-access';
    AuthSession.refreshToken = 'valid-refresh';
    var requests = 0;
    final api = VendorRepositoryImpl(client: MockClient((req) async {
      requests++;
      if (req.url.path.endsWith('/token/refresh/')) {
        expect(jsonDecode(req.body)['refresh'], 'valid-refresh');
        return http.Response(jsonEncode({'access':'new-access'}), 200);
      }
      if (req.headers['authorization'] == 'Bearer old-access') {
        return http.Response('{}', 401);
      }
      expect(req.headers['authorization'], 'Bearer new-access');
      return http.Response(jsonEncode({'data':[]}), 200);
    }));
    addTearDown(api.close);
    expect(await api.request('vendors/guides/'), isEmpty);
    expect(requests, 3);
  });
  test('public registration does not send an existing customer token', () async {
    AuthSession.userRole = 'customer';
    AuthSession.accessToken = 'customer-token';
    final api = VendorRepositoryImpl(client: MockClient((req) async {
      expect(req.headers.containsKey('authorization'), isFalse);
      return http.Response(jsonEncode({'data':{'status':'pending_approval'}}), 201);
    }));
    addTearDown(api.close);
    expect(await api.request('vendors/register/', method:'POST', body:{'brand_name':'New partner'}),
      {'status':'pending_approval'});
  });
  test('bearer authentication and encoded filters', () async {
    AuthSession.userRole = 'vendor_admin';
    AuthSession.accessToken = 'vendor-token';
    final api = VendorRepositoryImpl(client: MockClient((req) async {
      expect(req.headers['authorization'], 'Bearer vendor-token');
      expect(req.url.queryParameters['search'], 'Sơn Trà & biển');
      expect(req.url.queryParameters.containsKey('vendor_id'), isFalse);
      return http.Response(
          jsonEncode({
            'data': {'bookings': []}
          }),
          200);
    }));
    addTearDown(api.close);
    expect(
        await api
            .request('vendors/bookings/', query: {'search': 'Sơn Trà & biển'}),
        {'bookings': []});
  });
  test('customer cannot call vendor API', () async {
    AuthSession.userRole = 'customer';
    final api = VendorRepositoryImpl(
        client: MockClient((_) async => throw StateError('Must not send')));
    addTearDown(api.close);
    await expectLater(api.request('vendors/dashboard/'), throwsException);
  });
  test('validation errors surface without retrying mutations', () async {
    AuthSession.userRole = 'vendor_admin';
    var sent = 0;
    final api = VendorRepositoryImpl(client: MockClient((_) async {
      sent++;
      return http.Response(
          jsonEncode({
            'errors': {
              'email': ['Already exists']
            }
          }),
          400);
    }));
    addTearDown(api.close);
    await expectLater(
        api.request('vendors/guides/',
            method: 'POST', body: {'email': 'used@example.com'}),
        throwsA(predicate((e) => '$e'.contains('Already exists'))));
    expect(sent, 1);
  });
  testWidgets('dashboard and booking status confirmation', (tester) async {
    final api = FakeVendorRepository();
    await tester.pumpWidget(
        MaterialApp(home: VendorPortalPage(onLogout: () {}, repository: api)));
    await tester.pumpAndSettle();
    expect(find.text('Sơn Trà Travel'), findsOneWidget);
    expect(find.text('1.000.000 đ'), findsOneWidget);
    await tester.tap(find.descendant(
        of: find.byType(NavigationBar), matching: find.text('Đơn đặt')));
    await tester.pumpAndSettle();
    expect(find.text('#ORD-42 • Lan'), findsOneWidget);
    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Xác nhận'));
    await tester.pumpAndSettle();
    expect(api.calls, isNot(contains('PATCH vendors/bookings/42/status/')));
    await tester.tap(find.widgetWithText(FilledButton, 'Xác nhận'));
    await tester.pumpAndSettle();
    expect(api.calls, contains('PATCH vendors/bookings/42/status/'));
    await tester.pumpWidget(const SizedBox());
  });
}
