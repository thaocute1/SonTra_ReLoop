import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth_session.dart';

class SocialAuthApi {
  const SocialAuthApi({this.client});

  final http.Client? client;

  Future<String?> exchangeToken(String url, String token) async {
    final http.Response response;
    try {
      final post = client?.post ?? http.post;
      response = await post(
        Uri.parse(url),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'token': token}),
      ).timeout(const Duration(seconds: 35));
    } on TimeoutException {
      throw Exception('Máy chủ đăng nhập phản hồi quá chậm. Vui lòng thử lại.');
    } on http.ClientException {
      throw Exception('Không kết nối được máy chủ đăng nhập. '
          'Vui lòng kiểm tra mạng và backend.');
    }

    dynamic decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw Exception('Máy chủ đăng nhập trả về dữ liệu không hợp lệ '
          '(${response.statusCode}).');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map
          ? _message(
              decoded['error'] ?? decoded['detail'] ?? decoded['message'])
          : null;
      throw Exception(message ??
          'Đăng nhập mạng xã hội thất bại (${response.statusCode}).');
    }

    final access = decoded is Map ? decoded['access'] : null;
    final user = decoded is Map ? decoded['user'] : null;
    if (access is! String || access.trim().isEmpty || user is! Map) {
      throw Exception('Máy chủ chưa trả về phiên đăng nhập hợp lệ.');
    }

    // Only replace the current session after validating the response.
    return AuthSession.start(Map<String, dynamic>.from(decoded as Map));
  }

  static String? _text(dynamic value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  static String? _message(dynamic value) {
    if (value is String) return _text(value);
    final values = value is Map ? value.values : value;
    if (values is Iterable) {
      for (final item in values) {
        final message = _message(item);
        if (message != null) return message;
      }
    }
    return null;
  }
}
