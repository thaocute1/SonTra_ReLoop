import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/chat/data/chat_repository.dart';
import 'package:son_tra_trail_quest/chat/pages/chat_sheet.dart';
import 'package:son_tra_trail_quest/tours/pages/tour_detail_page.dart';

const tourBlock = {
  'type': 'tour_list',
  'items': [
    {'id': 16, 'title': 'Tour Sơn Trà buổi sáng', 'price': '450000.00'},
  ],
};

void main() {
  setUp(() {
    AuthSession.accessToken = 'test-token';
    AuthSession.userId = 'user-1';
    SharedPreferences.setMockInitialValues({});
  });
  tearDown(AuthSession.clear);

  test('chat uses authenticated backend endpoint and exact request contract',
      () async {
    final repository = ChatRepository(client: MockClient((request) async {
      expect(request.url.path, '/api/v1/cms-chatbot/agent/chat/');
      expect(request.headers['Authorization'], 'Bearer test-token');
      expect(jsonDecode(request.body),
          {'message': 'Tôi muốn đặt tour Sơn Trà', 'session_id': 'mobile-1'});
      return http.Response(jsonEncode({'ok': true, 'answer': 'Welcome'}), 200);
    }));
    final reply =
        await repository.send(' Tôi muốn đặt tour Sơn Trà ', 'mobile-1');
    expect(reply.text, 'Welcome');
  });

  test('server and authentication failures are safe user messages', () async {
    final repository = ChatRepository(
        client:
            MockClient((_) async => http.Response('<html>error</html>', 502)));
    await expectLater(
        repository.send('Hello', 'mobile-1'), throwsA(isA<ChatException>()));
    AuthSession.clear();
    await expectLater(
        repository.send('Hello', 'mobile-1'), throwsA(isA<ChatException>()));
  });

  testWidgets(
      'chat loads history, sends a question and displays assistant reply',
      (tester) async {
    final repository = ChatRepository(client: MockClient((request) async {
      if (request.method == 'GET') {
        expect(request.url.path, '/api/v1/cms-chatbot/agent/history/');
        expect(
            request.url.queryParameters['session_id'], startsWith('mobile-'));
        return http.Response(
            jsonEncode({
              'ok': true,
              'messages': [
                {
                  'role': 'assistant',
                  'content': 'Previous answer',
                  'blocks': [tourBlock]
                },
              ]
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'});
      }
      return http.Response(
          jsonEncode({'ok': true, 'answer': 'New answer'}), 200);
    }));
    await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ChatSheet(repository: repository))));
    await tester.pumpAndSettle();
    expect(find.text('Previous answer'), findsOneWidget);
    expect(find.text('450.000 đ'), findsOneWidget);
    await tester.tap(find.text('Xem chi tiết tour'));
    await tester.pumpAndSettle();
    expect(
        tester.widget<TourDetailPage>(find.byType(TourDetailPage)).tour.id, 16);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Tìm tour Sơn Trà cho tôi');
    await tester.tap(find.byTooltip('Gửi tin nhắn'));
    await tester.pumpAndSettle();
    expect(find.text('Tìm tour Sơn Trà cho tôi'), findsOneWidget);
    expect(find.text('New answer'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('accepts tour-only replies and ignores invalid or duplicate tour IDs',
      () async {
    final repository = ChatRepository(
        client: MockClient((_) async => http.Response(
            jsonEncode({
              'ok': true,
              'answer': '',
              'blocks': [
                tourBlock,
                tourBlock,
                {
                  'type': 'tour_list',
                  'items': [
                    {'id': 0},
                    null
                  ]
                },
              ]
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'})));
    final reply = await repository.send('Tìm tour', 'mobile-1');
    expect(reply.tours.single.tour.id, 16);
    expect(reply.tours.single.price, 450000);
  });

  testWidgets('failed send restores draft for retry', (tester) async {
    final repository = ChatRepository(
        client: MockClient((request) async => request.method == 'GET'
            ? http.Response('{"ok":true,"messages":[]}', 200)
            : http.Response('{}', 429)));
    await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ChatSheet(repository: repository))));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Retry question');
    await tester.tap(find.byTooltip('Gửi tin nhắn'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Retry question');
    expect(find.textContaining('Bạn gửi quá nhanh'), findsOneWidget);
  });
}
