import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_config.dart';

class PasswordRecoveryService {
  const PasswordRecoveryService({http.Client? client}) : _client = client;

  final http.Client? _client;

  Future<String> requestRecovery(String email) async {
    final post = _client?.post ?? http.post;
    final response = await post(
      Uri.parse(Appconfig.forgotPasswordUrl),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim().toLowerCase()}),
    ).timeout(const Duration(seconds: 15));

    const fallback = 'Không thể gửi yêu cầu. Vui lòng thử lại sau.';
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(fallback);
    }
    final dynamic body;
    try {
      body = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw Exception(fallback);
    }
    if (body is! Map) throw Exception(fallback);
    final message = body['message'];
    return message is String && message.trim().isNotEmpty
        ? message
        : 'Đã ghi nhận yêu cầu khôi phục mật khẩu.';
  }
}
