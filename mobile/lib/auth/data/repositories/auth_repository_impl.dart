import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_config.dart';
import '../services/auth_session.dart';
import '../../domain/entities/login_credentials.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl();

  @override
  Future<String?> login(LoginCredentials credentials) async {
    AuthSession.userEmail = credentials.email;
    final response = await http
        .post(
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

    _saveAccessToken(response.body);
    return _userName(response.body);
  }

  void _saveAccessToken(String body) {
    try {
      final decoded = jsonDecode(body);
      final token = decoded is Map<String, dynamic> ? decoded['access'] : null;
      if (token is String && token.isNotEmpty) {
        AuthSession.accessToken = token;
      }
    } on FormatException {
      // The username parser handles malformed success responses safely.
    }
  }

  String? _userName(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final user = decoded['user'];
        if (user is Map<String, dynamic>) {
          final name = user['name'];
          AuthSession.userName = name is String ? name.trim() : null;
          final email = user['email'];
          if (email is String && email.trim().isNotEmpty) {
            AuthSession.userEmail = email.trim();
          }
          final phone = user['phone'];
          if (phone is String && phone.trim().isNotEmpty) {
            AuthSession.userPhone = phone.trim();
          }
          if (name is String && name.trim().isNotEmpty) return name.trim();
        }
      }
    } on FormatException {
      return null;
    }
    return null;
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
