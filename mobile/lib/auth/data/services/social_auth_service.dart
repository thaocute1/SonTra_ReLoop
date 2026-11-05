import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import '../../../core/constants/app_config.dart';

class SocialAuthService {
  const SocialAuthService();

  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: const ['email'],
    serverClientId: Appconfig.googleServerClientId,
  );

  /// Đăng nhập bằng Google và gửi ID token về Django.
  Future<String?> loginWithGoogle() async {
    try {
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) {
        throw Exception('Bạn đã hủy đăng nhập Google.');
      }

      final GoogleSignInAuthentication authentication =
          await account.authentication;
      final String? idToken = authentication.idToken;

      if (idToken == null || idToken.isEmpty) {
        throw Exception(
          'Không lấy được Google ID token. '
          'Hãy kiểm tra cấu hình OAuth Client ID.',
        );
      }

      return await _sendToken(
        Appconfig.googleLoginUrl,
        idToken,
      );
    } on PlatformException catch (error) {
      throw Exception(
        'Đăng nhập Google thất bại (${error.code}). '
        'Hãy kiểm tra cấu hình OAuth và SHA-1.',
      );
    }
  }

  /// Đăng nhập Facebook và gửi access token về Django.
  Future<String?> loginWithFacebook() async {
    final LoginResult result = await FacebookAuth.instance.login(
      permissions: const [
        'email',
        'public_profile',
      ],
    );

    if (result.status != LoginStatus.success || result.accessToken == null) {
      if (result.status == LoginStatus.cancelled) {
        throw Exception('Bạn đã hủy đăng nhập Facebook.');
      }

      throw Exception(
        result.message ?? 'Đăng nhập Facebook thất bại.',
      );
    }

    return _sendToken(
      Appconfig.facebookLoginUrl,
      result.accessToken!.tokenString,
    );
  }

  /// Gửi token đến Django.
  ///
  /// Giữ nguyên cách đọc response hiện tại:
  /// {"user": {"name": "..."}}
  ///
  /// Nếu backend trả response khác, cần điều chỉnh theo
  /// serializer/API thực tế.
  Future<String?> _sendToken(
    String url,
    String token,
  ) async {
    final http.Response response = await http
        .post(
          Uri.parse(url),
          headers: const {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: jsonEncode({
            'token': token,
          }),
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Đăng nhập mạng xã hội thất bại '
        '(${response.statusCode}): ${_safeErrorMessage(response.body)}',
      );
    }

    if (response.body.trim().isEmpty) {
      return null;
    }

    try {
      final dynamic decoded = jsonDecode(response.body);

      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final dynamic user = decoded['user'];

      if (user is! Map<String, dynamic>) {
        return null;
      }

      final dynamic name = user['name'];

      if (name is String && name.trim().isNotEmpty) {
        return name.trim();
      }

      return null;
    } on FormatException {
      throw Exception(
        'Backend trả về dữ liệu JSON không hợp lệ.',
      );
    }
  }

  String _safeErrorMessage(String body) {
    try {
      final dynamic decoded = jsonDecode(body);

      if (decoded is Map<String, dynamic>) {
        final dynamic detail = decoded['detail'];

        if (detail is String) {
          return detail;
        }

        final dynamic message = decoded['message'];

        if (message is String) {
          return message;
        }
      }
    } catch (_) {
      // Không phải JSON; không hiển thị nguyên response.
    }

    return 'Vui lòng kiểm tra cấu hình hoặc API Django.';
  }
}
