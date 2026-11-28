import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/entities/login_credentials.dart';

class RememberedLoginService {
  const RememberedLoginService(
      {FlutterSecureStorage storage = const FlutterSecureStorage()})
      : _storage = storage;

  final FlutterSecureStorage _storage;

  String _key(bool vendor) => 'remembered_login_${vendor ? 'vendor' : 'user'}';

  Future<LoginCredentials?> read({required bool vendor}) async {
    final raw = await _storage.read(key: _key(vendor));
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw);
      if (data is Map &&
          data['email'] is String &&
          data['password'] is String &&
          (data['email'] as String).isNotEmpty &&
          (data['password'] as String).isNotEmpty) {
        return LoginCredentials(
            email: data['email'], password: data['password']);
      }
    } on FormatException {
      // Remove an incomplete or outdated record instead of prefilling it.
    }
    await clear(vendor: vendor);
    return null;
  }

  Future<void> save(LoginCredentials credentials, {required bool vendor}) =>
      _storage.write(
          key: _key(vendor),
          value: jsonEncode({
            'email': credentials.email.trim(),
            'password': credentials.password,
          }));

  Future<void> clear({required bool vendor}) =>
      _storage.delete(key: _key(vendor));
}
