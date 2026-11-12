import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_config.dart';
import '../services/auth_session.dart';
import '../../domain/entities/login_credentials.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({http.Client? client}) : _client = client;

  final http.Client? _client;

  @override
  Future<String?> login(LoginCredentials credentials) async {
    final post = _client?.post ?? http.post;
    final response = await post(
          Uri.parse(Appconfig.loginUrl),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': credentials.email,
            'password': credentials.password,
          }),
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_errorMessage(response));
    }

    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Invalid login response.');
    }
    return AuthSession.start(decoded);
  }

  String _errorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic>) {
        final message = _findMessage(body['error']);
        if (message != null) return message;
      }
    } on FormatException {
      return response.reasonPhrase ?? 'Đăng nhập thất bại.';
    }
    return response.reasonPhrase ?? 'Đăng nhập thất bại.';
  }

  String? _findMessage(dynamic value) {
    if (value is String && value.isNotEmpty) return value;
    if (value is Map) {
      for (final item in value.values) {
        final message = _findMessage(item);
        if (message != null) return message;
      }
    }
    if (value is Iterable) {
      for (final item in value) {
        final message = _findMessage(item);
        if (message != null) return message;
      }
    }
    return null;
  }
}
