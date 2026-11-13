import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/guide/data/trip_repository.dart';
import 'package:son_tra_trail_quest/guide/domain/trip.dart';
import 'package:son_tra_trail_quest/guide/pages/trip_detail_page.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    AuthSession.userId = 'test-guide';
    AuthSession.accessToken = 'test-token';
  });
  tearDown(AuthSession.clear);

  test('network failure persists attendance and retry keeps the request UUID',
      () async {
    String? firstId;
    var offline = true;
    final repo = TripRepository(client: MockClient((request) async {
      final payload = jsonDecode(request.body) as Map;
      if (offline) {
        firstId = payload['request_id'];
        throw http.ClientException('offline');
      }
      expect(payload['request_id'], firstId);
      expect(request.headers['Authorization'], 'Bearer test-token');
      return http.Response('{"data": {"id": 1}}', 201);
    }));
    expect(await repo.attendance(2, 3, 'departure', 'present'), false);
    expect((await repo.pending()).length, 1);
    offline = false;
    await repo.sync();
    expect(await repo.pending(), isEmpty);
    repo.close();
  });

  test('server rejection is visible and is not queued as a network failure',
      () async {
    final repo = TripRepository(
        client: MockClient((request) async => http.Response.bytes(
            utf8.encode('{"message":"Chuyến đã kết thúc"}'), 409)));
    await expectLater(repo.attendance(2, 3, 'departure', 'present'),
        throwsA(isA<TripApiException>()));
    expect(await repo.pending(), isEmpty);
    repo.close();
  });

  test('offline queue is isolated between accounts', () async {
    final repo = TripRepository(
        client: MockClient((_) async => throw http.ClientException('offline')));
    await repo.event(1, {'kind': 'support', 'content': 'Help'});
    AuthSession.userId = 'other-user';
    final otherRepo = TripRepository();
    expect(await otherRepo.pending(), isEmpty);
    otherRepo.close();
    AuthSession.userId = 'test-guide';
    expect((await repo.pending()).length, 1);
    repo.close();
  });

  test('older queued attendance sends before a newer correction', () async {
    var offline = true;
    final statuses = <String>[];
    final repo = TripRepository(client: MockClient((request) async {
      if (offline) throw http.ClientException('offline');
      statuses.add(jsonDecode(request.body)['participant_status']);
      return http.Response('{}', 201);
    }));
    await repo.attendance(1, 2, 'departure', 'present');
    offline = false;
    expect(await repo.attendance(1, 2, 'departure', 'absent'), true);
    expect(statuses, ['present', 'absent']);
    expect(await repo.pending(), isEmpty);
    repo.close();
  });

  test('temporary server failure keeps SOS for retry', () async {
    final repo = TripRepository(
        client: MockClient(
            (_) async => http.Response('{"message":"Unavailable"}', 503)));
    expect(
        await repo
            .event(1, {'kind': 'support', 'content': 'Help', 'sos': true}),
        false);
    expect((await repo.pending()).length, 1);
    repo.close();
  });

  test('cached trip survives network loss but not authorization rejection',
      () async {
    var state = 'online';
    final repo = TripRepository(client: MockClient((_) async {
      if (state == 'offline') throw http.ClientException('offline');
      if (state == 'revoked') {
        return http.Response('{"detail":"Forbidden"}', 403);
      }
      return http.Response(
          jsonEncode({
            'schedule': {'id': 1, 'tour_title': 'Test'},
            'participants': []
          }),
          200);
    }));
    expect((await repo.detail(1)).cached, false);
    state = 'offline';
    expect((await repo.detail(1)).cached, true);
    state = 'revoked';
    await expectLater(repo.detail(1), throwsA(isA<TripApiException>()));
    repo.close();
  });

  test('departure attendance never implies the person has returned', () {
    expect(
        Participant({
          'latest_attendance': {'stage': 'departure', 'status': 'present'}
        }).resolved,
        false);
    expect(
        Participant({
          'latest_attendance': {'stage': 'departure', 'status': 'absent'}
        }).resolved,
        true);
    expect(
        Participant({
          'latest_attendance': {'stage': 'return', 'status': 'left_group'}
        }).resolved,
        false);
    expect(
        Participant({
          'latest_attendance': {'stage': 'return', 'status': 'early_return'}
        }).resolved,
        true);
  });

  test('group alerts ignore stale GPS and cached data', () {
    final now = DateTime.utc(2026, 11, 13, 8);
    final json = <String, dynamic>{
      'schedule': {'id': 1, 'status': 'in_progress'},
      'positions': [
        for (final (id, lat) in [16.0, 16.02].indexed)
          {
            'user_id': id,
            'payload': {
              'latitude': lat,
              'longitude': 108.0,
              'accuracy': 10,
              'captured_at': now.toIso8601String()
            }
          }
      ]
    };
    expect(TripDetail(json).separationAlerts(300, now: now).length, 2);
    expect(
        TripDetail(json)
            .separationAlerts(300, now: now.add(const Duration(minutes: 3))),
        isEmpty);
    expect(TripDetail(json, cached: true).separationAlerts(300, now: now),
        isEmpty);
  });

  testWidgets('participant detail fits a narrow phone and supports large text',
      (tester) async {
    tester.view.physicalSize = const Size(360, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(
        home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(1.3)),
            child: ParticipantPage(
              participant: Participant({
                'id': 1,
                'full_name': 'Nguyễn Văn Thành',
                'phone': '0901234567',
                'attendance_logs': []
              }),
              editable: true,
              onCall: (_) async {},
              onSave: (_) async {},
            ))));
    await tester.pump();
    expect(find.text('Nguyễn Văn Thành'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
