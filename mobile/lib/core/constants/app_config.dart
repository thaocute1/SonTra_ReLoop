class Appconfig {
  static const String ipAddress = '10.0.2.2';
  static const String port = '8000';
  static const String googleServerClientId =
      '549328711371-3h10tp4lqkb1gpbfb0c8so2ql2gph28i.apps.googleusercontent.com';

  static String get baseUrl => 'http://$ipAddress:$port';
  static String get apiBaseUrl => '$baseUrl/api/v1';
  static String get accountsBaseUrl => '$apiBaseUrl/accounts';
  static String get toursBaseUrl => '$apiBaseUrl/tours';
  static String get ordersBaseUrl => '$apiBaseUrl/orders';
  static String get paymentsBaseUrl => '$apiBaseUrl/payments';
  static String get challengingBaseUrl => '$apiBaseUrl/challenging';
  static String get gamificationBaseUrl => '$apiBaseUrl/gamification';
  static String get flashSalesBaseUrl => '$apiBaseUrl/flash-sales';

  static String get loginUrl => '$accountsBaseUrl/login/';
  static String get registerUrl => '$accountsBaseUrl/register/';
  static String get profileUrl => '$accountsBaseUrl/me/';
  static String get googleLoginUrl => '$accountsBaseUrl/google/';
  static String get facebookLoginUrl => '$accountsBaseUrl/facebook/';
}
