import 'package:flutter_test/flutter_test.dart';
import 'package:son_tra_trail_quest/dashboard/data/weather_service.dart';

void main() {
  SonTraWeather sample(
          {int code = 0,
          double rain = 0,
          double wind = 5,
          double temperature = 28,
          bool day = true}) =>
      SonTraWeather(
        temperature: temperature,
        wind: wind,
        precipitation: rain,
        code: code,
        isDay: day,
        updatedAt: DateTime.utc(2026, 11, 13),
      );
  test('storm takes precedence over rain and heat', () {
    final weather = sample(code: 95, rain: 5, temperature: 36);
    expect(weather.description, 'Có dông');
    expect(weather.note, contains('dông sét'));
  });
  test('rain code works even with zero reported precipitation', () {
    expect(sample(code: 61).rain, isTrue);
    expect(sample(rain: 0.2).description, 'Có mưa');
    expect(sample(code: 61).note, contains('trơn'));
  });
  test('temperature and wind change the note; night has no sunshine label', () {
    expect(sample(temperature: 36).note, contains('Trời nóng'));
    expect(sample(wind: 45).note, contains('Gió mạnh'));
    expect(sample(day: false).description, 'Đêm quang mây');
  });
  test('parses API units and UTC timestamp; missing values are rejected', () {
    final weather = SonTraWeather.fromJson({
      'current': {
        'temperature_2m': 28.5,
        'wind_speed_10m': 12,
        'precipitation': 0,
        'weather_code': 2,
        'is_day': 1,
        'time': 1794528000,
      }
    });
    expect(weather.temperature, 28.5);
    expect(weather.updatedAt.isUtc, isTrue);
    expect(weather.description, 'Mây rải rác');
    expect(() => SonTraWeather.fromJson({'current': <String, dynamic>{}}),
        throwsFormatException);
  });
}
