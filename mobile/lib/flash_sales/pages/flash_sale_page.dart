import 'dart:async';

import 'package:flutter/material.dart';

import '../../booking/pages/booking_page.dart';
import '../../tours/data/tour_repository.dart';
import '../../tours/domain/repositories/tour_repository.dart';
import '../data/flash_sale_repository.dart';
import '../domain/entities/flash_sale.dart';

class FlashSalePage extends StatefulWidget {
  const FlashSalePage(
      {super.key,
      this.repository = const FlashSaleRepository(),
      this.tours = const TourRepositoryImpl()});

  final FlashSaleRepository repository;
  final TourRepository tours;

  @override
  State<FlashSalePage> createState() => _FlashSalePageState();
}

class _FlashSalePageState extends State<FlashSalePage> {
  late Future<FlashSaleSession?> _session;
  Timer? _timer;
  DateTime? _boundary;
  int _remaining = 0;
  bool _opening = false;

  @override
  void initState() {
    super.initState();
    _session = _load();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final boundary = _boundary;
      if (boundary == null) return;
      final seconds = _secondsUntil(boundary);
      if (seconds == 0) {
        _reload();
      } else if (seconds != _remaining) {
        setState(() => _remaining = seconds);
      }
    });
  }

  int _secondsUntil(DateTime boundary) {
    final milliseconds = boundary.difference(DateTime.now()).inMilliseconds;
    return milliseconds <= 0 ? 0 : (milliseconds + 999) ~/ 1000;
  }

  Future<FlashSaleSession?> _load() async {
    _boundary = null;
    _remaining = 0;
    final session = await widget.repository.getActiveSession();
    if (session != null) {
      _boundary = session.boundary ??
          DateTime.now().add(Duration(seconds: session.countdown));
      _remaining = _secondsUntil(_boundary!);
      // A stale response must not cause a refresh loop.
      if (_remaining == 0) _boundary = null;
    }
    return session;
  }

  void _reload() {
    final session = _load();
    setState(() {
      _session = session;
    });
  }

  Future<void> _openBooking(FlashSaleItem item) async {
    if (_opening || _remaining == 0) return;
    final session = _session;
    final boundary = _boundary!;
    setState(() => _opening = true);
    try {
      final tour = await widget.tours.getTour(item.tourId);
      if (!mounted || session != _session || _secondsUntil(boundary) == 0) {
        return;
      }
      await Navigator.of(context).push(MaterialPageRoute<void>(
        builder: (_) => BookingPage(tour: tour, flashSaleItem: item),
      ));
      if (mounted) _reload();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$error')),
        );
      }
    } finally {
      if (mounted) setState(() => _opening = false);
    }
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
        body: FutureBuilder<FlashSaleSession?>(
          future: _session,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            final session = snapshot.data;
            if (session == null) {
              return Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(snapshot.hasError
                    ? 'Không thể tải Flash Sale.'
                    : 'Hiện chưa có phiên Flash Sale.'),
                TextButton(onPressed: _reload, child: const Text('Tải lại')),
              ]));
            }
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Countdown(seconds: _remaining, live: session.isLive),
                const SizedBox(height: 12),
                if (session.items.isEmpty) ...[
                  const Text('Phiên này chưa có tour ưu đãi được duyệt.'),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: _reload,
                      child: const Text('Tải lại'),
                    ),
                  ),
                ],
                ...session.items.map((item) => _ItemCard(
                    item: item,
                    label: item.remainingSlots <= 0
                        ? 'Hết suất'
                        : !session.isLive
                            ? 'Sắp mở'
                            : _remaining == 0
                                ? 'Đã kết thúc'
                                : 'Đặt ngay',
                    onTap: !_opening &&
                            session.isLive &&
                            _remaining > 0 &&
                            item.remainingSlots > 0
                        ? () => _openBooking(item)
                        : null)),
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
        Text(live ? (seconds > 0 ? 'Đang diễn ra' : 'Đã kết thúc') : 'Sắp mở',
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
  const _ItemCard(
      {required this.item, required this.onTap, required this.label});
  final FlashSaleItem item;
  final VoidCallback? onTap;
  final String label;

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
                        child:
                            FilledButton(onPressed: onTap, child: Text(label))),
                  ]),
            ),
          ]),
        ),
      );

  String _money(int value) =>
      '${value.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
}
