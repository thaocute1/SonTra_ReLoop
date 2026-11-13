import 'package:flutter/foundation.dart';

class AuthSession {
  AuthSession._();

  static String? accessToken;
  static String? userId;
  static bool get isGuide => userRole == 'guide';
  static String? userName;
  static String? userEmail;
  static String? userPhone;
  static String? userRole;
  static bool get isStaff => userRole == 'staff' || userRole == 'system_admin';
  static final pointsRevision = ValueNotifier<int>(0);

  static void notifyPointsChanged() => pointsRevision.value++;

  static void clear() {
    accessToken = null;
    userId = null;
    userName = null;
    userEmail = null;
    userPhone = null;
    userRole = null;
  }

  static String? start(Map<String, dynamic> response) {
    final token = response['access'];
    final user = response['user'];
    if (token is! String || token.trim().isEmpty || user is! Map) {
      throw Exception('Máy chủ chưa trả về phiên đăng nhập hợp lệ.');
    }
    clear();
    accessToken = token;
    userId = '${user['id'] ?? user['email']}';
    userName = _text(user['name']);
    userEmail = _text(user['email']);
    userPhone = _text(user['phone']);
    userRole = _text(user['role']);
    return userName;
  }

  static String? _text(dynamic value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  static Map<String, String> get headers => {
        'Content-Type': 'application/json',
        if (accessToken != null && accessToken!.isNotEmpty)
          'Authorization': 'Bearer $accessToken',
      };
}
