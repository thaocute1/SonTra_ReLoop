import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/missions/data/mission_repository.dart';

void main() {
  tearDown(AuthSession.clear);

  test('uploads proof, note and GPS then notifies points listeners once',
      () async {
    final directory = await Directory.systemTemp.createTemp('mission-test-');
    try {
      final photo =
          await File('${directory.path}/proof.jpg').writeAsString('image-data');
      AuthSession.accessToken = 'session';
      final revision = AuthSession.pointsRevision.value;
      final repository =
          MissionRepositoryImpl(client: MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer session');
        expect(
            request.headers['content-type'], contains('multipart/form-data'));
        expect(request.body, contains('name="proof_file"'));
        expect(request.body, contains('image/jpeg'));
        expect(request.body, contains('Experience note'));
        expect(request.body, contains('16.1'));
        return http.Response(
            jsonEncode({
              'new_total_points': 620,
              'task': {
                'id': 3,
                'title': 'Mission',
                'status': 'completed',
                'points': 90
              },
            }),
            200);
      }));
      final mission = await repository.completeMission(3,
          proofPath: photo.path,
          note: 'Experience note',
          latitude: 16.1,
          longitude: 108.2,
          gpsAccuracy: 5);
      expect(mission.isCompleted, isTrue);
      expect(AuthSession.pointsRevision.value, revision + 1);
    } finally {
      await directory.delete(recursive: true);
    }
  });

  test('backend error is shown and points listeners are not notified',
      () async {
    final revision = AuthSession.pointsRevision.value;
    final repository = MissionRepositoryImpl(
        client: MockClient((_) async =>
            http.Response('{"error":{"detail":"Mission unavailable"}}', 500)));
    await expectLater(
        repository.completeMission(3),
        throwsA(predicate(
            (error) => error.toString().contains('Mission unavailable'))));
    expect(AuthSession.pointsRevision.value, revision);
  });
}
