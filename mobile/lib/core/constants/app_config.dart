class Appconfig {
  static const String ipAddress = '192.168.1.104';
  static const String port = '8000';

  static String get baseUrl => 'http://$ipAddress:$port';
  static String get loginUrl => '$baseUrl/api/auth/login';
  static String get registerUrl => '$baseUrl/api/auth/register';
  }