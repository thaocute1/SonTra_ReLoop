class AuthSession {
  AuthSession._();

  static String? accessToken;
  static String? userName;
  static String? userEmail;
  static String? userPhone;

  static void clear() {
    accessToken = null;
    userName = null;
    userEmail = null;
    userPhone = null;
  }

  static Map<String, String> get headers => {
        'Content-Type': 'application/json',
        if (accessToken != null && accessToken!.isNotEmpty)
          'Authorization': 'Bearer $accessToken',
      };
}
