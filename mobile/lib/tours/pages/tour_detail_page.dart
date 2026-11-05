import 'package:flutter/material.dart';
import '../domain/entities/tour.dart';
import 'tracking_page.dart';
import '../../booking/pages/booking_page.dart';
import '../data/tour_repository.dart';

class TourDetailPage extends StatefulWidget {
  const TourDetailPage({super.key, required this.tour});

  final Tour tour;

  @override
  State<TourDetailPage> createState() => _TourDetailPageState();
}

class _TourDetailPageState extends State<TourDetailPage> {
  static const _forest = Color(0xFF4E7567);
  static const _ink = Color(0xFF26332D);
  static const _muted = Color(0xFF718078);
  String? _error;
  late Future<Tour> _tourDetails;

  @override
  void initState() {
    super.initState();
    _tourDetails = const TourRepositoryImpl().getTour(widget.tour.id);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Tour>(
      future: _tourDetails,
      builder: (context, snapshot) {
        final tour = snapshot.data ?? widget.tour;
        return Scaffold(
          backgroundColor: const Color(0xFFF8FAF8),
          appBar: AppBar(
            backgroundColor: const Color(0xFFF8FAF8),
            elevation: 0,
            title: const Text('Chi tiết cung đường',
                style: TextStyle(color: _ink, fontWeight: FontWeight.w800)),
            iconTheme: const IconThemeData(color: _ink),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: tour.imageUrl.isEmpty
                    ? _imageFallback()
                    : Image.network(tour.imageUrl,
                        height: 150,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        loadingBuilder: (context, child, progress) {
                          if (progress == null) return child;
                          return _imageFallback(
                            child: const CircularProgressIndicator(),
                          );
                        },
                        errorBuilder: (_, __, ___) => Container(
                            height: 150,
                            color: const Color(0xFFDCE8E1),
                            child: const Icon(Icons.landscape_rounded,
                                color: _forest, size: 44))),
              ),
              const SizedBox(height: 14),
              Row(children: [
                const Icon(Icons.verified_rounded, color: _forest, size: 15),
                const SizedBox(width: 5),
                Text('Tuyến chuẩn an toàn',
                    style: TextStyle(
                        color: _forest,
                        fontSize: 11,
                        fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 8),
              Text(tour.title,
                  style: const TextStyle(
                      color: _ink, fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Row(children: [
                _stat('${tour.distanceKm.toStringAsFixed(1)} km', 'Độ dài'),
                _stat('${tour.durationHours.toStringAsFixed(1)} giờ',
                    'Thời gian'),
                _stat(tour.difficultyLabel, 'Độ khó'),
              ]),
              if (tour.description.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(tour.description,
                    style: const TextStyle(color: _muted, height: 1.4)),
              ],
              const SizedBox(height: 20),
              const Text('Checkpoints trên tuyến',
                  style: TextStyle(
                      color: _ink, fontSize: 15, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              if (tour.checkpoints.isEmpty)
                const Text('Chưa có checkpoint GPS cho tuyến này.',
                    style: TextStyle(color: _muted))
              else
                ...tour.checkpoints.map((checkpoint) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.location_on,
                          color: _forest, size: 19),
                      title: Text(
                          'Checkpoint ${checkpoint.order}: ${checkpoint.name}',
                          style: const TextStyle(
                              color: _ink,
                              fontSize: 12,
                              fontWeight: FontWeight.w700)),
                      subtitle: Text(checkpoint.description,
                          style: const TextStyle(color: _muted, fontSize: 11)),
                    )),
              if (_error != null)
                Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_error!,
                        style:
                            const TextStyle(color: Colors.red, fontSize: 12))),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => BookingPage(tour: tour))),
                    style: FilledButton.styleFrom(backgroundColor: _forest),
                    child: const Text('Đặt tour ngay'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => TrackingPage(tour: tour))),
                    icon: const Icon(Icons.gps_fixed, size: 17),
                    label: const Text('Trekking'),
                  ),
                ),
              ]),
            ],
          ),
        );
      },
    );
  }

  Widget _stat(String value, String label) => Expanded(
        child: Container(
          margin: const EdgeInsets.only(right: 6),
          padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 5),
          decoration: BoxDecoration(
              color: const Color(0xFFE6EFEB),
              borderRadius: BorderRadius.circular(10)),
          child: Column(children: [
            Text(value,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: _forest, fontSize: 11, fontWeight: FontWeight.w800)),
            Text(label, style: const TextStyle(color: _muted, fontSize: 9)),
          ]),
        ),
      );

  Widget _imageFallback({Widget? child}) => Container(
        height: 150,
        width: double.infinity,
        color: const Color(0xFFDCE8E1),
        child: child ??
            const Icon(Icons.landscape_rounded, color: _forest, size: 44),
      );
}
