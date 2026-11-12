import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';

import 'package:son_tra_trail_quest/tours/data/tour_repository.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';
import 'package:son_tra_trail_quest/tours/domain/repositories/tour_repository.dart';
import 'package:son_tra_trail_quest/tours/domain/usecases/get_safe_tours_use_case.dart';

void main() {
  tearDown(AuthSession.clear);

  test('list and detail include session token and canonical API paths',
      () async {
    AuthSession.accessToken = 'test-session';
    final paths = <String>[];
    final repository = TourRepositoryImpl(client: _FakeClient((request) {
      expect(request.headers['Authorization'], 'Bearer test-session');
      paths.add(request.url.path);
      return http.Response(
        request.url.path.endsWith('/7/')
            ? '{"data":{"id":7,"title":"Detail"}}'
            : '{"data":[{"id":7,"title":"List"}]}',
        200,
      );
    }));
    expect((await repository.getTours()).single.id, 7);
    expect((await repository.getTour(7)).title, 'Detail');
    expect(paths, ['/api/v1/tours/', '/api/v1/tours/7/']);
  });

  for (final code in [401, 403]) {
    test('HTTP $code asks the user to log in again', () async {
      final repository = TourRepositoryImpl(
          client: _FakeClient((_) => http.Response('{}', code)));
      await expectLater(
          repository.getTours(),
          throwsA(predicate(
              (error) => error.toString().contains('đăng nhập lại'))));
    });
  }

  test('invalid response is an error instead of an empty tour list', () async {
    final repository = TourRepositoryImpl(
        client: _FakeClient((_) => http.Response('{"unexpected":true}', 200)));
    await expectLater(repository.getTours(), throwsA(isA<Exception>()));
  });

  test('network failure has a readable error', () async {
    final repository = TourRepositoryImpl(client: _FakeClient((_) {
      throw http.ClientException('connection refused');
    }));
    await expectLater(
        repository.getTours(),
        throwsA(predicate((error) =>
            error.toString().contains('Không kết nối được máy chủ'))));
  });

  test('parses tour difficulty and route distance', () {
    final tour = Tour.fromJson({
      'id': 7,
      'title': 'Cây Đa Di Sản',
      'difficulty_level': 'easy',
      'difficulty_label': 'Dễ',
      'route': {'total_distance_km': 3.2},
      'duration_hours': 2.5,
      'price': 120000,
      'checkpoints': [
        {'name': 'Trạm Vệ', 'order_index': 1, 'latitude': 16.1},
      ],
    });

    expect(tour.difficulty, 'easy');
    expect(tour.distanceKm, 3.2);
    expect(tour.checkpoints.single.name, 'Trạm Vệ');
  });

  test('repository loads tours from the API response envelope', () async {
    final repository = TourRepositoryImpl(
      client: _FakeClient((request) => http.Response(
            '{"status":"success","data":[{"id":1,"title":"Easy","difficulty_level":"easy"}]}',
            200,
          )),
    );

    final tours = await repository.getTours();

    expect(tours, hasLength(1));
    expect(tours.single.title, 'Easy');
  });

  test('safe tours use case delegates to the domain repository', () async {
    final repository = _FakeRepository([
      Tour.fromJson({'id': 1, 'title': 'Tuyến xanh'}),
    ]);

    final tours = await GetSafeToursUseCase(repository)();

    expect(tours.single.title, 'Tuyến xanh');
  });
}

class _FakeClient extends http.BaseClient {
  _FakeClient(this.handler);

  final http.Response Function(http.BaseRequest request) handler;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final response = handler(request);
    return http.StreamedResponse(
      Stream.value(response.bodyBytes),
      response.statusCode,
      headers: response.headers,
      reasonPhrase: response.reasonPhrase,
    );
  }
}

class _FakeRepository implements TourRepository {
  _FakeRepository(this.tours);

  final List<Tour> tours;

  @override
  Future<List<Tour>> getTours() async => tours;

  @override
  Future<Tour> getTour(int id) async => tours.first;
}
