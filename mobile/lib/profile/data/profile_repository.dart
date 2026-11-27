import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';

class ProfileRepository {
  const ProfileRepository({http.Client? client}) : _client = client;

  final http.Client? _client;

  Future<List<Map<String, dynamic>>> getBookings() async {
    final get = _client?.get ?? http.get;
    final response = await get(Uri.parse(Appconfig.myBookingsUrl),
            headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = jsonDecode(utf8.decode(response.bodyBytes));
    final data = body is Map ? body['data'] : body;
    return _maps(data);
  }

  Future<void> requestRefund(int bookingId, Map<String, String> details) async {
    final post = _client?.post ?? http.post;
    final response = await post(
            Uri.parse(Appconfig.refundRequestUrl(bookingId)),
            headers: AuthSession.headers,
            body: jsonEncode(details))
        .timeout(const Duration(seconds: 20));
    const fallback = 'Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại.';
    if (response.statusCode >= 500) throw Exception(fallback);
    final dynamic body;
    try {
      body = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw Exception(fallback);
    }
    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        body is Map &&
        body['status'] == 'success') {
      return;
    }
    final error = body is Map ? body['error'] : null;
    final message = body is Map
        ? body['message'] ?? (error is Map ? error['detail'] : error)
        : null;
    throw Exception(message is String ? message : fallback);
  }

  Future<List<Map<String, dynamic>>> getVouchers() async {
    final response = await http
        .get(Uri.parse(Appconfig.vouchersUrl), headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = jsonDecode(response.body);
    final data = body is Map ? body['results'] : body;
    return _maps(data);
  }

  void _check(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải dữ liệu hồ sơ.');
    }
  }

  List<Map<String, dynamic>> _maps(dynamic value) => value is List
      ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
      : const [];
}
