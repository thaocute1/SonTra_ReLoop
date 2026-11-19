import 'package:flutter/material.dart';

import '../../tours/pages/tour_detail_page.dart';
import '../data/chat_repository.dart';

class ChatTourCard extends StatelessWidget {
  const ChatTourCard({super.key, required this.item});

  final ChatTour item;
  static const _forest = Color(0xFF4E7567);

  @override
  Widget build(BuildContext context) {
    final tour = item.tour;
    final price = item.price;
    final rating = item.rating;
    final details = [
      tour.difficultyLabel,
      if (tour.durationHours > 0) '${_decimal(tour.durationHours)} giờ',
      if (rating != null) '★ ${_decimal(rating)}',
    ];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      color: const Color(0xFFF1F6F3),
      child: InkWell(
        onTap: () {
          FocusScope.of(context).unfocus();
          Navigator.of(context).push(MaterialPageRoute<void>(
            builder: (_) => TourDetailPage(tour: tour),
          ));
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (tour.imageUrl.isEmpty)
              _imageFallback()
            else
              Image.network(tour.imageUrl,
                  height: 120,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _imageFallback()),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tour.title,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(details.join(' · ')),
                  if (tour.description.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(tour.description,
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                  if (price != null) ...[
                    const SizedBox(height: 8),
                    Text('${_formatPrice(price)} đ',
                        style: const TextStyle(
                            color: _forest, fontWeight: FontWeight.w700)),
                  ],
                  const SizedBox(height: 8),
                  const Row(children: [
                    Expanded(
                        child: Text('Xem chi tiết tour',
                            style: TextStyle(
                                color: _forest, fontWeight: FontWeight.w700))),
                    Icon(Icons.chevron_right, color: _forest),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imageFallback() => const SizedBox(
        height: 72,
        child: ColoredBox(
            color: Color(0xFFE6EFEB),
            child: Center(
                child:
                    Icon(Icons.landscape_rounded, color: _forest, size: 32))),
      );

  String _decimal(double value) =>
      value.toStringAsFixed(1).replaceAll('.', ',');

  String _formatPrice(int price) => price
      .toString()
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
}
