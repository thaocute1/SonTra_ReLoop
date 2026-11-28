import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/health/data/health_repository.dart';
import 'package:son_tra_trail_quest/health/pages/health_page.dart';

void main() {
  tearDown(AuthSession.clear);
  testWidgets(
      'loads health profile and saves only health fields with Vietnamese notes',
      (tester) async {
    AuthSession.accessToken = 'user-token';
    Map<String, dynamic>? saved;
    final client = MockClient((request) async {
      expect(request.headers['authorization'], 'Bearer user-token');
      expect(request.url.path, '/api/v1/accounts/me/');
      if (request.method == 'PATCH') {
        saved = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(jsonEncode({'user': saved}), 200,
            headers: {'content-type': 'application/json; charset=utf-8'});
      }
      return http.Response(
          jsonEncode({
            'name': 'Lan',
            'height_cm': '165.00',
            'weight_kg': '55.00',
            'fitness_level': 'normal',
            'medical_notes': 'Dị ứng phấn hoa'
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'});
    });
    addTearDown(client.close);
    await tester.pumpWidget(MaterialApp(
        home: HealthPage(repository: HealthRepository(client: client))));
    await tester.pumpAndSettle();
    expect(find.text('165.00'), findsOneWidget);
    final weight = find.byKey(const ValueKey('weight_kg'));
    await tester.ensureVisible(weight);
    await tester.enterText(weight, '56,5');
    final notes = find.byKey(const ValueKey('medical_notes'));
    await tester.ensureVisible(notes);
    await tester.enterText(notes, 'Dị ứng hải sản');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    final save = find.text('Lưu hồ sơ sức khỏe');
    await tester.ensureVisible(save);
    await tester.pumpAndSettle();
    await tester.tap(save);
    await tester.pumpAndSettle();
    expect(saved?['weight_kg'], 56.5);
    expect(saved?['medical_notes'], 'Dị ứng hải sản');
    expect(saved?.containsKey('name'), isFalse);
    expect(saved?.containsKey('role'), isFalse);
    expect(find.text('Đã lưu hồ sơ sức khỏe.'), findsOneWidget);
  });
  testWidgets('invalid measurements prevent API writes', (tester) async {
    var writes = 0;
    final client = MockClient((request) async {
      if (request.method == 'PATCH') writes++;
      return http.Response('{}', 200);
    });
    addTearDown(client.close);
    await tester.pumpWidget(MaterialApp(
        home: HealthPage(repository: HealthRepository(client: client))));
    await tester.pumpAndSettle();
    final height = find.byKey(const ValueKey('height_cm'));
    await tester.ensureVisible(height);
    await tester.enterText(height, '0');
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Lưu hồ sơ sức khỏe'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lưu hồ sơ sức khỏe'));
    await tester.pumpAndSettle();
    expect(writes, 0);
    expect(
        find.text('Nhập giá trị lớn hơn 0 và không quá 300'), findsOneWidget);
  });
  testWidgets('load errors provide retry rather than an empty editable profile',
      (tester) async {
    var reads = 0;
    final client = MockClient((_) async {
      reads++;
      return http.Response('{}', 500);
    });
    addTearDown(client.close);
    await tester.pumpWidget(MaterialApp(
        home: HealthPage(repository: HealthRepository(client: client))));
    await tester.pumpAndSettle();
    expect(find.text('Lưu hồ sơ sức khỏe'), findsNothing);
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(reads, 2);
  });
}
