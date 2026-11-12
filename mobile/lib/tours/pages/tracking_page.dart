import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../domain/entities/tour.dart';

class TrackingPage extends StatefulWidget {
  const TrackingPage({super.key, required this.tour});

  final Tour tour;

  @override
  State<TrackingPage> createState() => _TrackingPageState();
}

class _TrackingPageState extends State<TrackingPage> {
  static const _forest = Color(0xFF315D4D);
  static const _ink = Color(0xFF24332D);
  static const _muted = Color(0xFF708078);
  StreamSubscription<Position>? _positionSubscription;
  Timer? _timer;
  Position? _position;
  Duration _elapsed = Duration.zero;
  double _distanceMeters = 0;
  bool _paused = false;
  bool _sosSent = false;
  int _nextCheckpoint = 0;
  bool _checkpointDialogVisible = false;
  String _gpsStatus = 'Đang tìm tín hiệu GPS';
  late final Widget _routeMap = RepaintBoundary(
    child: _RouteMap(tour: widget.tour),
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _prepareLocation();
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!_paused && mounted) {
        setState(() => _elapsed += const Duration(seconds: 1));
      }
    });
  }

  Future<void> _prepareLocation() async {
    try {
      final enabled = await Geolocator.isLocationServiceEnabled()
          .timeout(const Duration(seconds: 10));
      if (!mounted) return;
      if (!enabled) {
        _setGpsStatus('GPS đang tắt');
        return;
      }
      var permission = await Geolocator.checkPermission()
          .timeout(const Duration(seconds: 10));
      if (!mounted) return;
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (!mounted) return;
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _setGpsStatus('Chưa cấp quyền vị trí');
        return;
      }
      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 5,
        ),
      ).listen(_onPosition, onError: (_) {
        _setGpsStatus('Không nhận được tín hiệu GPS');
      });
    } catch (_) {
      _setGpsStatus('Không khởi động được GPS');
    }
  }

  void _setGpsStatus(String status) {
    if (mounted) setState(() => _gpsStatus = status);
  }

  void _onPosition(Position position) {
    final previous = _position;
    if (!mounted) return;
    setState(() {
      _position = position;
      _gpsStatus = 'GPS Tín hiệu tốt';
      if (!_paused && previous != null) {
        _distanceMeters += Geolocator.distanceBetween(
          previous.latitude,
          previous.longitude,
          position.latitude,
          position.longitude,
        );
      }
    });
    _checkCheckpoint(position);
  }

  void _checkCheckpoint(Position position) {
    final checkpoints = widget.tour.checkpoints;
    if (_checkpointDialogVisible || _nextCheckpoint >= checkpoints.length) {
      return;
    }
    final checkpoint = checkpoints[_nextCheckpoint];
    if (checkpoint.latitude == 0 && checkpoint.longitude == 0) return;
    final distance = Geolocator.distanceBetween(
      position.latitude,
      position.longitude,
      checkpoint.latitude,
      checkpoint.longitude,
    );
    if (distance <= 50) {
      _checkpointDialogVisible = true;
      _showCheckpoint(checkpoint);
    }
  }

  Future<void> _showCheckpoint(TourCheckpoint checkpoint) async {
    await showModalBottomSheet<void>(
      context: context,
      isDismissible: false,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFDCE4DF),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 12),
            const Text('🎉 Đã đến Checkpoint!',
                style: TextStyle(color: _forest, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('Checkpoint ${checkpoint.order}: ${checkpoint.name}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: _ink, fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            const Text(
              'Bạn đã mở khóa mốc này. Kiểm tra tín hiệu an toàn và chụp ảnh check-in để nhận điểm xanh.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _muted, fontSize: 11, height: 1.4),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.camera_alt_outlined, size: 17),
                label: const Text('Chụp ảnh Check-in & Tích điểm'),
                style: FilledButton.styleFrom(
                  backgroundColor: _forest,
                  shape: const StadiumBorder(),
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Bỏ qua & Tiếp tục đi'),
            ),
          ],
        ),
      ),
    );
    if (mounted) {
      setState(() {
        _nextCheckpoint++;
        _checkpointDialogVisible = false;
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _positionSubscription?.cancel();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE0E7DF),
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: _routeMap),
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Row(
                children: [
                  _statusChip(
                    icon: _position == null ? Icons.gps_off : Icons.gps_fixed,
                    label: _gpsStatus,
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: _sendSos,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: _sosSent ? _forest : const Color(0xFFE45C4A),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Text(_sosSent ? 'Đã gửi SOS' : '⚠ SOS',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 18,
              child: _statsPanel(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusChip({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .88),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: _forest),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: _forest, fontSize: 9)),
      ]),
    );
  }

  Widget _statsPanel() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
      child: Column(
        children: [
          Row(children: [
            _stat('${(_distanceMeters / 1000).toStringAsFixed(2)} km',
                'Quãng đường'),
            _stat(_formatDuration(_elapsed), 'Thời gian'),
            _stat('${_position?.altitude.round() ?? 0} m', 'Độ cao'),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _paused = !_paused),
                icon: Icon(_paused ? Icons.play_arrow : Icons.pause,
                    size: 15, color: _forest),
                label: Text(_paused ? 'Tiếp tục' : 'Tạm dừng',
                    style: const TextStyle(color: _forest, fontSize: 11)),
                style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFDCE4DF)),
                    shape: const StadiumBorder()),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _finish,
                icon: const Icon(Icons.stop, size: 15, color: Colors.red),
                label: const Text('Kết thúc',
                    style: TextStyle(color: Colors.red, fontSize: 11)),
                style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFFFD1CA)),
                    shape: const StadiumBorder()),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _stat(String value, String label) => Expanded(
        child: Column(children: [
          Text(value,
              style: const TextStyle(
                  color: _ink, fontSize: 12, fontWeight: FontWeight.w800)),
          const SizedBox(height: 3),
          Text(label, style: const TextStyle(color: _muted, fontSize: 9)),
        ]),
      );

  void _sendSos() {
    setState(() => _sosSent = true);
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã ghi nhận yêu cầu hỗ trợ khẩn cấp.')));
  }

  Future<void> _finish() async {
    final shouldFinish = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.fromLTRB(24, 10, 24, 28),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFDCE4DF),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 22),
            Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                color: Color(0xFFFFECE8),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.flag_rounded,
                  color: Color(0xFFD95B4A), size: 28),
            ),
            const SizedBox(height: 14),
            const Text(
              'Kết thúc hành trình?',
              style: TextStyle(
                  color: _ink, fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn đã đi ${(_distanceMeters / 1000).toStringAsFixed(2)} km '
              'trong ${_formatDuration(_elapsed)}.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: _muted, fontSize: 12, height: 1.4),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _forest,
                      side: const BorderSide(color: Color(0xFFDCE4DF)),
                      minimumSize: const Size.fromHeight(46),
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('Tiếp tục'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFD95B4A),
                      minimumSize: const Size.fromHeight(46),
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('Kết thúc'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (shouldFinish == true && mounted) Navigator.pop(context);
  }
}

class _RouteMap extends StatelessWidget {
  const _RouteMap({required this.tour});

  final Tour tour;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        CustomPaint(painter: _TerrainPainter()),
        if (tour.imageUrl.isNotEmpty)
          Image.network(
            tour.imageUrl,
            cacheWidth: 1080,
            fit: BoxFit.cover,
            color: Colors.black.withValues(alpha: .48),
            colorBlendMode: BlendMode.darken,
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0x660D3029),
                Color(0x000D3029),
                Color(0x880D3029),
              ],
              stops: [0, .48, 1],
            ),
          ),
        ),
        CustomPaint(painter: _RoutePainter(tour.checkpoints)),
      ],
    );
  }
}

class _TerrainPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final background = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFB8D0BA), Color(0xFF648C73), Color(0xFF315D4D)],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, background);

    final ridgePaint = Paint()
      ..color = Colors.white.withValues(alpha: .13)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    for (var index = 0; index < 7; index++) {
      final path = Path()
        ..moveTo(-20, size.height * (.13 + index * .12))
        ..quadraticBezierTo(
          size.width * .35,
          size.height * (.03 + index * .12),
          size.width * .7,
          size.height * (.17 + index * .1),
        )
        ..quadraticBezierTo(
          size.width * .9,
          size.height * (.25 + index * .08),
          size.width + 20,
          size.height * (.13 + index * .12),
        );
      canvas.drawPath(path, ridgePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _TerrainPainter oldDelegate) => false;
}

class _RoutePainter extends CustomPainter {
  const _RoutePainter(this.checkpoints);

  final List<TourCheckpoint> checkpoints;

  @override
  void paint(Canvas canvas, Size size) {
    final points = <Offset>[
      Offset(size.width * .28, size.height * .76),
      Offset(size.width * .44, size.height * .61),
      Offset(size.width * .62, size.height * .42),
      Offset(size.width * .76, size.height * .25),
    ];
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    final routeShadow = Paint()
      ..color = Colors.black.withValues(alpha: .3)
      ..strokeWidth = 9
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, routeShadow);
    final route = Paint()
      ..color = const Color(0xFF205D49)
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, route);
    final marker = Paint()..color = Colors.white;
    for (var i = 0; i < math.min(points.length, checkpoints.length); i++) {
      canvas.drawCircle(points[i], 8, marker);
      canvas.drawCircle(points[i], 4, Paint()..color = const Color(0xFF3D8069));
      _label(canvas, checkpoints[i].name, points[i] + const Offset(8, -8));
    }
    canvas.drawCircle(points.first, 7, marker);
    canvas.drawCircle(points.first, 4, Paint()..color = Colors.blue);
  }

  void _label(Canvas canvas, String text, Offset offset) {
    final painter = TextPainter(
      text: TextSpan(
          text: text,
          style: const TextStyle(
              color: Color(0xFF24332D),
              fontSize: 9,
              fontWeight: FontWeight.w700)),
      textDirection: TextDirection.ltr,
    )..layout();
    final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(offset.dx, offset.dy, painter.width + 8, 18),
        const Radius.circular(4));
    canvas.drawRRect(rect, Paint()..color = Colors.white.withValues(alpha: .9));
    painter.paint(canvas, offset + const Offset(4, 3));
  }

  @override
  bool shouldRepaint(covariant _RoutePainter oldDelegate) => false;
}
