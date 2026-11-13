import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/trip.dart';

class TripApiException implements Exception {
  TripApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  bool get retryable =>
      statusCode != null &&
      (statusCode! >= 500 || statusCode == 408 || statusCode == 429);
  @override
  String toString() => message;
}

class TripRepository {
  TripRepository({http.Client? client})
      : _client = client ?? http.Client(),
        _owner = AuthSession.userId ?? AuthSession.userEmail ?? 'anonymous',
        _headers = Map<String, String>.from(AuthSession.headers);
  final http.Client _client;
  final String _owner;
  final Map<String, String> _headers;
  String get _queueKey => 'field_queue_$_owner';
  String get _base => Appconfig.toursBaseUrl;
  void close() => _client.close();
  static String requestId() {
    final bytes = List.generate(16, (_) => Random.secure().nextInt(256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  Future<Json> _request(String method, String path, [Json? payload]) async {
    final request = http.Request(method, Uri.parse('$_base/$path'));
    request.headers.addAll(_headers);
    if (payload != null) request.body = jsonEncode(payload);
    final response = await http.Response.fromStream(
            await _client.send(request).timeout(const Duration(seconds: 15)))
        .timeout(const Duration(seconds: 15));
    if (response.statusCode >= 500) {
      throw TripApiException(
          'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.',
          statusCode: response.statusCode);
    }
    Json body = {};
    try {
      if (response.bodyBytes.isNotEmpty) {
        body = Map<String, dynamic>.from(
            jsonDecode(utf8.decode(response.bodyBytes)));
      }
    } catch (_) {
      throw TripApiException(
          'Máy chủ trả dữ liệu không hợp lệ (${response.statusCode}).',
          statusCode: response.statusCode);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw TripApiException(
          text(body['message'] ?? body['detail'] ?? body).isEmpty
              ? 'Không thể thực hiện thao tác.'
              : text(body['message'] ?? body['detail'] ?? body),
          statusCode: response.statusCode);
    }
    return body;
  }

  Future<List<Trip>> trips({required bool guide}) async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'field_trips_${_owner}_$guide';
    try {
      final body =
          await _request('GET', guide ? 'guide/schedules/' : 'field/my-trips/');
      await prefs.setString(
          key,
          jsonEncode({
            'at': DateTime.now().toUtc().toIso8601String(),
            'data': body['data']
          }));
      return records(body['data']).map(Trip.new).toList();
    } on TripApiException {
      rethrow;
    } catch (_) {
      final cached = prefs.getString(key);
      if (cached != null) {
        final value = jsonDecode(cached) as Json;
        if (DateTime.now().difference(DateTime.parse(value['at'])).inHours <
            24) {
          return records(value['data'])
              .map((v) => Trip({...v, 'cached': true}))
              .toList();
        }
        await prefs.remove(key);
      }
      throw TripApiException(
          'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
    }
  }

  Future<TripDetail> detail(int id) async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'field_cache_${_owner}_$id';
    try {
      final data = await _request('GET', 'field/$id/');
      await prefs.setString(
          key,
          jsonEncode(
              {'at': DateTime.now().toUtc().toIso8601String(), 'data': data}));
      return TripDetail(data);
    } on TripApiException {
      rethrow;
    } catch (_) {
      final cached = prefs.getString(key);
      if (cached != null) {
        final value = jsonDecode(cached) as Json;
        if (DateTime.now().difference(DateTime.parse(value['at'])).inHours <
            24) {
          return TripDetail(Map<String, dynamic>.from(value['data']),
              cached: true);
        }
        await prefs.remove(key);
      }
      throw TripApiException(
          'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    }
  }

  Future<List<Json>> pending() async {
    final prefs = await SharedPreferences.getInstance();
    return records(jsonDecode(prefs.getString(_queueKey) ?? '[]'));
  }

  Future<void> _save(List<Json> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  // Persist before sending; the same UUID survives timeouts and restarts.
  Future<bool> submit(String path, Json payload) async {
    final queue = await pending();
    final entry = {
      'path': path,
      'payload': {...payload, 'request_id': requestId()},
      'at': DateTime.now().toUtc().toIso8601String()
    };
    queue.add(entry);
    await _save(queue);
    try {
      while (queue.isNotEmpty) {
        final next = queue.first;
        if (DateTime.now().difference(DateTime.parse(next['at'])).inHours >=
            24) {
          throw TripApiException(
              'Có thao tác quá 24 giờ. Kiểm tra danh sách chờ trước khi đồng bộ.');
        }
        await _request(
            'POST', next['path'], Map<String, dynamic>.from(next['payload']));
        queue.removeAt(0);
        await _save(queue);
      }
      return true;
    } on TripApiException catch (e) {
      if (e.retryable) return false;
      if (queue.isNotEmpty && identical(queue.first, entry)) {
        queue.remove(entry);
      }
      await _save(queue);
      rethrow;
    } on TimeoutException {
      return false;
    } on http.ClientException {
      return false;
    }
  }

  Future<void> sync() async {
    final queue = await pending();
    while (queue.isNotEmpty) {
      final entry = queue.first;
      if (DateTime.now().difference(DateTime.parse(entry['at'])).inHours >=
          24) {
        throw TripApiException(
            'Có thao tác quá 24 giờ. Kiểm tra và xóa thao tác cũ trước khi đồng bộ.');
      }
      await _request(
          'POST', entry['path'], Map<String, dynamic>.from(entry['payload']));
      queue.removeAt(0);
      await _save(queue);
    }
  }

  Future<void> discardPending() => _save([]);
  Future<void> discard(String requestId) async {
    final queue = await pending();
    queue.removeWhere((entry) => entry['payload']['request_id'] == requestId);
    await _save(queue);
  }

  Future<void> start(int id) async {
    await _request('POST', 'guide/schedules/$id/start/', {});
  }

  Future<void> finish(int id, String report) async {
    await _request(
        'POST', 'guide/schedules/$id/finish/', {'trip_report': report});
  }

  Future<bool> attendance(int id, int person, String stage, String status,
          {int? checkpoint, String note = ''}) =>
      submit('guide/schedules/$id/attendance/', {
        'participant_id': person,
        'attendance_stage': stage,
        'participant_status': status,
        'checkpoint_id': checkpoint,
        'note': note
      });
  Future<void> updatePerson(int id, int person, Json data) async {
    await _request('PATCH', 'guide/schedules/$id/participants/$person/', data);
  }

  Future<bool> event(int id, Json data) => submit('field/$id/', data);
  Future<void> handleSupport(int id, int event, String status) async {
    await _request('PATCH', 'field/$id/support/$event/', {'status': status});
  }

  Future<void> position(int id, Json data) async {
    await _request('POST', 'field/$id/', {
      ...data,
      'kind': 'position',
      'consent': true,
      'request_id': requestId()
    });
  }

  Future<void> stopSharing(int id) async {
    await _request('DELETE', 'field/$id/');
  }
}
