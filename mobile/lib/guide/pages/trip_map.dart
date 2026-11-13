import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../domain/trip.dart';

// Web Mercator coordinates shared by OSM raster tiles and the route overlay.
Offset mercator(double lat, double lon) {
  final radians = lat.clamp(-85.0, 85.0) * math.pi / 180;
  return Offset((lon + 180) / 360,
      (1 - math.log(math.tan(radians) + 1 / math.cos(radians)) / math.pi) / 2);
}

class TripMap extends StatelessWidget {
  const TripMap({super.key, required this.detail});
  final TripDetail detail;
  @override
  Widget build(BuildContext context) {
    final route = detail.route;
    final points = <Offset>[];
    void add(dynamic lat, dynamic lng) {
      final a = double.tryParse('$lat'), b = double.tryParse('$lng');
      if (a != null && b != null) points.add(mercator(a, b));
    }

    add(route['start_latitude'], route['start_longitude']);
    for (final cp in detail.checkpoints) {
      add(cp['latitude'], cp['longitude']);
    }
    add(route['end_latitude'], route['end_longitude']);
    final positions =
        detail.positions.where((p) => p['payload'] is Map).toList();
    final locations = <Offset>[];
    for (final p in positions) {
      final data = p['payload'] as Map;
      locations.add(mercator(double.parse('${data['latitude']}'),
          double.parse('${data['longitude']}')));
    }
    final all = [...points, ...locations];
    if (all.isEmpty) {
      return const SizedBox(
          height: 180,
          child: Center(child: Text('Chưa có tọa độ cung đường.')));
    }
    return SizedBox(
        height: 330,
        child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: LayoutBuilder(builder: (context, constraints) {
              final minX = all.map((p) => p.dx).reduce(math.min),
                  maxX = all.map((p) => p.dx).reduce(math.max);
              final minY = all.map((p) => p.dy).reduce(math.min),
                  maxY = all.map((p) => p.dy).reduce(math.max);
              final center = Offset((minX + maxX) / 2, (minY + maxY) / 2);
              var zoom = 16;
              while (zoom > 2 &&
                  ((maxX - minX) * 256 * math.pow(2, zoom) >
                          constraints.maxWidth - 64 ||
                      (maxY - minY) * 256 * math.pow(2, zoom) >
                          constraints.maxHeight - 64)) {
                zoom--;
              }
              final scale = 256.0 * math.pow(2, zoom);
              final origin = center * scale -
                  Offset(constraints.maxWidth / 2, constraints.maxHeight / 2);
              Offset local(Offset p) => p * scale - origin;
              return Stack(clipBehavior: Clip.hardEdge, children: [
                const Positioned.fill(
                    child: ColoredBox(color: Color(0xFFE4EDE5))),
                for (var x = (origin.dx / 256).floor();
                    x <= ((origin.dx + constraints.maxWidth) / 256).floor();
                    x++)
                  for (var y = (origin.dy / 256).floor();
                      y <= ((origin.dy + constraints.maxHeight) / 256).floor();
                      y++)
                    Positioned(
                        left: x * 256 - origin.dx,
                        top: y * 256 - origin.dy,
                        width: 256,
                        height: 256,
                        child: Image.network(
                            'https://tile.openstreetmap.org/$zoom/$x/$y.png',
                            headers: const {
                              'User-Agent': 'SonTraReLoop/0.1 (trekking mobile)'
                            },
                            errorBuilder: (_, error, stack) =>
                                const SizedBox())),
                Positioned.fill(
                    child: CustomPaint(
                        painter: _RoutePainter(points.map(local).toList()))),
                for (final (i, point) in points.indexed)
                  Positioned(
                      left: local(point).dx - 12,
                      top: local(point).dy - 12,
                      child: CircleAvatar(
                          radius: 12,
                          backgroundColor: const Color(0xFF315D4D),
                          child: Text('${i + 1}',
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.white)))),
                for (final (i, point) in locations.indexed)
                  Positioned(
                      left: local(point).dx - 13,
                      top: local(point).dy - 30,
                      child: Tooltip(
                          message:
                              'Thành viên ${positions[i]['participant_id'] ?? positions[i]['user_id']}',
                          child: const Icon(Icons.person_pin_circle,
                              color: Colors.deepOrange, size: 30))),
                const Positioned(
                    left: 6,
                    bottom: 4,
                    child: ColoredBox(
                        color: Colors.white,
                        child: Text('© OpenStreetMap contributors',
                            style: TextStyle(fontSize: 10)))),
                const Positioned(
                    left: 8,
                    top: 8,
                    right: 8,
                    child: Text(
                        'Đường nối các checkpoint · không phải chỉ dẫn đường mòn',
                        style: TextStyle(
                            fontSize: 11, backgroundColor: Colors.white))),
              ]);
            })));
  }
}

class _RoutePainter extends CustomPainter {
  _RoutePainter(this.points);
  final List<Offset> points;
  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(
        path,
        Paint()
          ..color = const Color(0xFF315D4D)
          ..strokeWidth = 3
          ..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(covariant _RoutePainter oldDelegate) => true;
}
