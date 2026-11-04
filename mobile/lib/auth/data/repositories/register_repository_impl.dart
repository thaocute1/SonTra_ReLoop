import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_config.dart';
import '../../domain/entities/register_credentials.dart';
import '../../domain/repositories/register_repository.dart';

class RegisterRepositoryImpl implements RegisterRepository {
  const RegisterRepositoryImpl();

  @override
  Future<void> register(RegisterCredentials credentials) async {
    final response = await http
        .post(
          Uri.parse(Appconfig.registerUrl),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'name': credentials.fullName,
            'email': credentials.email,
            'password': credentials.password,
          }),
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_errorMessage(response));
    }
  }

  String _errorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic>) {
        final message = _findMessage(body['error'] ?? body);
        if (message != null) return message;
      }
    } on FormatException {
      return response.reasonPhrase ?? 'Đăng ký thất bại.';
    }
    return response.reasonPhrase ?? 'Đăng ký thất bại.';
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
