import 'dart:convert';
import 'package:http/http.dart' as http;

class SonTraWeather {
  const SonTraWeather(
      {required this.temperature,
      required this.wind,
      required this.precipitation,
      required this.code,
      required this.isDay,
      required this.updatedAt});
  final double temperature, wind, precipitation;
  final int code;
  final bool isDay;
  final DateTime updatedAt;

  factory SonTraWeather.fromJson(Map<String, dynamic> json) {
    final current = json['current'] as Map<String, dynamic>;
    double number(String key) {
      final value = current[key];
      if (value is! num || !value.isFinite) {
        throw const FormatException('Invalid weather data');
      }
      return value.toDouble();
    }

    return SonTraWeather(
      temperature: number('temperature_2m'),
      wind: number('wind_speed_10m'),
      precipitation: number('precipitation'),
      code: number('weather_code').toInt(),
      isDay: number('is_day') == 1,
      updatedAt: DateTime.fromMillisecondsSinceEpoch(
          number('time').toInt() * 1000,
          isUtc: true),
    );
  }

  bool get storm => code >= 95 && code <= 99;
  bool get rain =>
      precipitation > 0 ||
      (code >= 51 && code <= 67) ||
      (code >= 80 && code <= 82);
  bool get fog => code == 45 || code == 48;
  String get description {
    if (storm) return 'Có dông';
    if (fog) return 'Có sương mù';
    if (code >= 71 && code <= 77 || code == 85 || code == 86) return 'Có tuyết';
    if (rain) return 'Có mưa';
    return switch (code) {
      0 => isDay ? 'Trời quang, có nắng' : 'Đêm quang mây',
      1 => 'Ít mây',
      2 => 'Mây rải rác',
      3 => 'Nhiều mây',
      _ => 'Thời tiết biến đổi',
    };
  }

  String get note {
    if (storm) return 'Lưu ý dông sét; kiểm tra thông báo của đơn vị tổ chức.';
    if (wind >= 40) {
      return 'Gió mạnh; kiểm tra điều kiện thực địa trước khi đi.';
    }
    if (rain) return 'Đường có thể trơn; chuẩn bị áo mưa và giày bám tốt.';
    if (fog) return 'Tầm nhìn có thể hạn chế; chú ý bám đoàn.';
    if (temperature >= 35) return 'Trời nóng; mang đủ nước và đồ chống nắng.';
    if (temperature <= 18) return 'Trời mát lạnh; chuẩn bị áo khoác.';
    return 'Kiểm tra thông báo của đơn vị tổ chức trước khi xuất phát.';
  }
}

class WeatherService {
  static final uri = Uri.https('api.open-meteo.com', '/v1/forecast', {
    'latitude': '16.12',
    'longitude': '108.28',
    'current':
        'temperature_2m,precipitation,weather_code,wind_speed_10m,is_day',
    'wind_speed_unit': 'kmh',
    'temperature_unit': 'celsius',
    'timezone': 'Asia/Ho_Chi_Minh',
    'timeformat': 'unixtime',
  });
  static Future<SonTraWeather> fetch() async {
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) throw Exception('Weather unavailable');
    return SonTraWeather.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>);
  }
}
