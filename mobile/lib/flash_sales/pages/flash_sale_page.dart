import 'dart:async';

import 'package:flutter/material.dart';

import '../../tours/data/tour_repository.dart';
import '../../tours/pages/tour_detail_page.dart';
import '../data/flash_sale_repository.dart';
import '../domain/entities/flash_sale.dart';

class FlashSalePage extends StatefulWidget {
  const FlashSalePage({super.key});

  @override
  State<FlashSalePage> createState() => _FlashSalePageState();
}

class _FlashSalePageState extends State<FlashSalePage> {
  late Future<FlashSaleSession> _session;
  Timer? _timer;
  int _remaining = 0;

  @override
  void initState() {
    super.initState();
    _session = _load();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remaining > 0) setState(() => _remaining--);
    });
  }

  Future<FlashSaleSession> _load() async {
    final session = FlashSaleSession.fromJson(
        await const FlashSaleRepository().getActiveSession());
    _remaining = session.countdown;
    return session;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        appBar: AppBar(
          title: const Text('Flash Sale Trekking'),
          backgroundColor: const Color(0xFFF8FAF8),
        ),
        body: FutureBuilder<FlashSaleSession>(
          future: _session,
          builder: (context, snapshot) {
            if (snapshot.hasError)
              return Center(child: Text('${snapshot.error}'));
            if (!snapshot.hasData)
              return const Center(child: CircularProgressIndicator());
            final session = snapshot.data!;
            if (session.items.isEmpty) {
              return const Center(
                  child: Text('Hiện chưa có Flash Sale đang diễn ra.'));
            }
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Countdown(seconds: _remaining, live: session.isLive),
                const SizedBox(height: 12),
                ...session.items.map((item) => _ItemCard(
                    item: item,
                    onTap: () async {
                      final tour =
                          await const TourRepositoryImpl().getTour(item.tourId);
                      if (context.mounted) {
                        Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                                builder: (_) => TourDetailPage(tour: tour)));
                      }
                    })),
              ],
            );
          },
        ),
      );
}

class _Countdown extends StatelessWidget {
  const _Countdown({required this.seconds, required this.live});
  final int seconds;
  final bool live;

  @override
  Widget build(BuildContext context) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: const Color(0xFFFFF1E4),
          borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        const Icon(Icons.bolt, color: Color(0xFFE47A25)),
        const SizedBox(width: 8),
        Text(live ? 'Đang diễn ra' : 'Sắp mở',
            style: const TextStyle(fontWeight: FontWeight.w800)),
        const Spacer(),
        Text(
            '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}',
            style: const TextStyle(fontWeight: FontWeight.w800)),
      ]),
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({required this.item, required this.onTap});
  final FlashSaleItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (item.imageUrl.isNotEmpty)
              Image.network(item.imageUrl,
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox(height: 20)),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('-${item.discount}%',
                        style: const TextStyle(
                            color: Colors.deepOrange,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text(item.title,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text(
                        '${_money(item.promoPrice)}  •  Còn ${item.remainingSlots} suất',
                        style: const TextStyle(
                            color: Color(0xFF4E7567),
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                            onPressed: onTap, child: const Text('Đặt ngay'))),
                  ]),
            ),
          ]),
        ),
      );

  String _money(int value) =>
      '${value.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
}
