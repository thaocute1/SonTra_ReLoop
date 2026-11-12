import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/auth/data/services/social_auth_api.dart';

void main() {
  tearDown(AuthSession.clear);

  for (final provider in ['google', 'facebook']) {
    test('$provider saves backend session and sends provider token', () async {
      final api = SocialAuthApi(client: MockClient((request) async {
        expect(request.url.path, '/api/v1/accounts/$provider/');
        expect(jsonDecode(request.body), {'token': 'provider-token'});
        return http.Response(
            jsonEncode({
              'access': 'backend-access',
              'user': {'name': 'Test User', 'email': 'test@example.com'},
            }),
            200);
      }));
      AuthSession.userPhone = 'old-phone';
      expect(
          await api.exchangeToken(
            'http://localhost/api/v1/accounts/$provider/',
            'provider-token',
          ),
          'Test User');
      expect(AuthSession.accessToken, 'backend-access');
      expect(AuthSession.userEmail, 'test@example.com');
      expect(AuthSession.userPhone, isNull);
    });
  }

  test('Missing access token cannot create a successful session', () async {
    final api = SocialAuthApi(
        client: MockClient(
            (_) async => http.Response('{"user":{"name":"Test"}}', 200)));
    await expectLater(api.exchangeToken('http://localhost/', 'token'),
        throwsA(isA<Exception>()));
    expect(AuthSession.accessToken, isNull);
  });

  test('Nested backend error is shown and existing session is preserved',
      () async {
    AuthSession.accessToken = 'existing';
    final api = SocialAuthApi(
        client: MockClient((_) async =>
            http.Response('{"error":{"token":["Invalid token"]}}', 400)));
    await expectLater(
        api.exchangeToken('http://localhost/', 'token'),
        throwsA(
            predicate((error) => error.toString().contains('Invalid token'))));
    expect(AuthSession.accessToken, 'existing');
  });

  test('Non-JSON success response is rejected', () async {
    final api = SocialAuthApi(
        client: MockClient(
            (_) async => http.Response('<html>Wrong URL</html>', 200)));
    await expectLater(api.exchangeToken('http://localhost/', 'token'),
        throwsA(isA<Exception>()));
    expect(AuthSession.accessToken, isNull);
  });
}
