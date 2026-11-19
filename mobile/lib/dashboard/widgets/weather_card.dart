import 'dart:async';
import 'package:flutter/material.dart';
import '../data/weather_service.dart';

class WeatherCard extends StatefulWidget {
  const WeatherCard({super.key});
  @override
  State<WeatherCard> createState() => _WeatherCardState();
}

class _WeatherCardState extends State<WeatherCard> with WidgetsBindingObserver {
  SonTraWeather? _weather;
  bool _loading = false, _failed = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(minutes: 10), (_) {
      if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        _load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final value = await WeatherService.fetch();
      if (mounted) {
        setState(() {
          _weather = value;
          _failed = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final weather = _weather;
    final stale = weather != null &&
        (_failed ||
            DateTime.now().toUtc().difference(weather.updatedAt).inMinutes >
                60);
    final time = weather?.updatedAt.add(const Duration(hours: 7));
    final icon = weather == null
        ? Icons.cloud_outlined
        : weather.storm
            ? Icons.thunderstorm_outlined
            : weather.rain
                ? Icons.water_drop_outlined
                : weather.fog
                    ? Icons.foggy
                    : weather.code >= 1 && weather.code <= 3
                        ? Icons.cloud_outlined
                        : weather.isDay
                            ? Icons.wb_sunny_outlined
                            : Icons.nightlight_outlined;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: const Color(0xFF4E7567),
          borderRadius: BorderRadius.circular(18)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Thời tiết & Nhiệt Độ – Sơn Trà',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 7),
          Text(
              weather == null
                  ? (_loading
                      ? 'Đang tải thời tiết…'
                      : 'Chưa tải được thời tiết. Bấm để thử lại.')
                  : '${weather.temperature.round()}°C · ${weather.description}\nGió ${weather.wind.round()} km/h · Mưa ${weather.precipitation.toStringAsFixed(1)} mm',
              style: const TextStyle(
                  color: Colors.white, fontSize: 13, height: 1.5)),
          if (weather != null) ...[
            const SizedBox(height: 6),
            Text(
                stale
                    ? 'Dữ liệu cũ; cần cập nhật trước khi tham khảo.'
                    : weather.note,
                style: const TextStyle(
                    color: Colors.white, fontSize: 12, height: 1.4)),
            const SizedBox(height: 6),
            Text(
                'Open-Meteo · ${time!.day}/${time.month} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')} (GMT+7)${stale ? ' · Chưa cập nhật' : ''}',
                style: const TextStyle(color: Colors.white70, fontSize: 10)),
          ],
        ])),
        const SizedBox(width: 8),
        IconButton(
          tooltip: 'Cập nhật thời tiết',
          onPressed: _loading ? null : _load,
          icon: _loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : Icon(icon, color: Colors.white),
          style: IconButton.styleFrom(
              side: const BorderSide(color: Colors.white54)),
        ),
      ]),
    );
  }
}
