import 'package:flutter/services.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/constants/app_config.dart';
import 'social_auth_api.dart';

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

      return await const SocialAuthApi().exchangeToken(
        Appconfig.googleLoginUrl,
        idToken,
      );
    } on PlatformException catch (error) {
      if (RegExp(r'ApiException:\s*10\b').hasMatch(error.message ?? '')) {
        throw Exception(
          'Google Sign-In chưa khớp cấu hình Android (mã 10). '
          'Hãy kiểm tra package, SHA-1 và OAuth Client ID.',
        );
      }
      if (error.code == 'network_error') {
        throw Exception('Không kết nối được với Google. Vui lòng thử lại.');
      }
      throw Exception(
        'Đăng nhập Google thất bại (${error.code}). Vui lòng thử lại.',
      );
    }
  }

  /// Đăng nhập Facebook và gửi access token về Django.
  Future<String?> loginWithFacebook() async {
    final LoginResult result;
    try {
      result = await FacebookAuth.instance.login();
    } on PlatformException catch (error) {
      throw Exception(
        'Không thể mở đăng nhập Facebook (${error.code}). '
        'Vui lòng kiểm tra cấu hình Facebook trên thiết bị.',
      );
    }

    if (result.status == LoginStatus.cancelled) {
      throw Exception('Bạn đã hủy đăng nhập Facebook.');
    }

    final accessToken = result.accessToken;
    if (result.status != LoginStatus.success ||
        accessToken == null ||
        accessToken.tokenString.trim().isEmpty) {
      throw Exception(
        result.message ?? 'Đăng nhập Facebook thất bại.',
      );
    }

    if (accessToken.type != AccessTokenType.classic) {
      throw Exception('Máy chủ chưa hỗ trợ Facebook Limited Login.');
    }

    return const SocialAuthApi().exchangeToken(
      Appconfig.facebookLoginUrl,
      accessToken.tokenString,
    );
  }
}
