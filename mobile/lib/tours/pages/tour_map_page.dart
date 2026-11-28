import 'package:flutter/material.dart';

import '../../guide/pages/trip_map.dart';
import '../domain/entities/tour.dart';

class TourMapPage extends StatelessWidget {
  const TourMapPage({super.key, required this.tour});

  final Tour tour;

  @override
  Widget build(BuildContext context) {
    final checkpoints = [...tour.checkpoints]
      ..sort((a, b) => a.order.compareTo(b.order));
    return Scaffold(
      appBar: AppBar(title: const Text('Bản đồ cung đường')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(tour.title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          TripMap.preview(checkpoints: [
            for (final checkpoint in checkpoints)
              {
                'latitude': checkpoint.latitude,
                'longitude': checkpoint.longitude
              },
          ]),
          const SizedBox(height: 16),
          const Text(
            'Xem trước các địa điểm trên cung đường. Để tham gia trekking, hãy đặt và thanh toán tour rồi vào “Đoàn của tôi”.',
            style: TextStyle(height: 1.5),
          ),
          const SizedBox(height: 20),
          const Text('Các địa điểm',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          if (checkpoints.isEmpty)
            const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Chưa có địa điểm cho cung đường này.')),
          for (final (index, checkpoint) in checkpoints.indexed)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(child: Text('${index + 1}')),
              title: Text(checkpoint.name),
              subtitle: checkpoint.description.isEmpty
                  ? null
                  : Text(checkpoint.description),
            ),
        ],
      ),
    );
  }
}
