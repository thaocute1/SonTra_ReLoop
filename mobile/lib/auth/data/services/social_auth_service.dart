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

    return const SocialAuthApi().exchangeToken(
      Appconfig.facebookLoginUrl,
      result.accessToken!.tokenString,
    );
  }
}
