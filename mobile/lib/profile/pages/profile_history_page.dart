import 'package:flutter/material.dart';

import '../../booking/domain/entities/booking.dart';
import '../../booking/pages/vnpay_payment_page.dart';
import '../data/profile_repository.dart';
import 'refund_request_page.dart';

class ProfileHistoryPage extends StatefulWidget {
  const ProfileHistoryPage(
      {super.key, this.repository = const ProfileRepository()});

  final ProfileRepository repository;

  @override
  State<ProfileHistoryPage> createState() => _ProfileHistoryPageState();
}

class _ProfileHistoryPageState extends State<ProfileHistoryPage> {
  late Future<List<Map<String, dynamic>>> _history =
      widget.repository.getBookings();

  void _reload() {
    final history = widget.repository.getBookings();
    setState(() {
      _history = history;
    });
  }

  Future<void> _resumeVNPay(BookingResult booking) async {
    await Navigator.push<void>(
        context,
        MaterialPageRoute<void>(
          builder: (_) => VNPayPaymentPage(booking: booking),
        ));
    if (mounted) {
      _reload();
    }
  }

  Future<void> _requestRefund(int id, String orderCode, String gateway) async {
    final sent = await Navigator.push<bool>(
        context,
        MaterialPageRoute<bool>(
          builder: (_) => RefundRequestPage(
              repository: widget.repository,
              bookingId: id,
              orderCode: orderCode,
              gateway: gateway),
        ));
    if (!mounted || sent != true) return;
    _reload();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text(
              'Đã gửi yêu cầu hoàn tiền. Vui lòng chờ quản trị viên duyệt.')),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Lịch sử chuyến đi'), actions: [
          IconButton(
              onPressed: _reload,
              icon: const Icon(Icons.refresh),
              tooltip: 'Làm mới'),
        ]),
        body: FutureBuilder<List<Map<String, dynamic>>>(
          future: _history,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            if (snapshot.connectionState == ConnectionState.waiting ||
                !snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final items = snapshot.data!;
            if (items.isEmpty) {
              return const Center(child: Text('Chưa có chuyến đi nào.'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (_, index) {
                final item = items[index];
                final booking = BookingResult.fromJson(item,
                    scheduleId: int.tryParse('${item['schedule_id']}') ?? 0);
                final bookingId = int.tryParse('${item['id']}') ?? 0;
                final gateway = '${item['payment_method'] ?? 'payos'}';
                final refund = item['refund_status'] ?? 'none';
                final canRefund = bookingId > 0 &&
                    item['payment_status'] == 'paid' &&
                    item['status'] == 'confirmed' &&
                    ['none', 'rejected'].contains(refund);
                final transaction = item['payment_transaction'];
                final simulated = transaction is Map &&
                    '${transaction['refund_provider_mode']}'.endsWith('_mock');
                final refundLabel = simulated && refund == 'refunded'
                    ? 'Đã hoàn tiền mô phỏng'
                    : '${item['refund_status_label'] ?? refund}';
                final canResume = item['payment_method'] == 'vnpay' &&
                    item['payment_status'] == 'pending' &&
                    item['status'] != 'cancelled' &&
                    booking.orderId > 0;
                return Card(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ListTile(
                          leading:
                              const CircleAvatar(child: Icon(Icons.terrain)),
                          title: Text(
                              '${item['tour_title'] ?? item['experience_name'] ?? 'Tour trekking'}'),
                          subtitle: Text(
                              '${item['departure_date_formatted'] ?? item['booking_date'] ?? ''}\n${item['status_label'] ?? item['status'] ?? ''}'),
                          isThreeLine: true,
                          trailing: canResume
                              ? TextButton(
                                  onPressed: () => _resumeVNPay(booking),
                                  child: const Text('Thanh toán VNPay'))
                              : Text('${item['total_price_formatted'] ?? ''}'),
                        ),
                        if (refund != 'none' || canRefund)
                          Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (refund != 'none')
                                    Text(refundLabel,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                  if (refund == 'rejected' &&
                                      item['refund_reason'] is String)
                                    Text(item['refund_reason'] as String),
                                  if (refund == 'refunded' &&
                                      item['refunded_amount'] is num)
                                    Text(
                                        '${MaterialLocalizations.of(context).formatDecimal((item['refunded_amount'] as num).toInt())} đ'),
                                  if (canRefund)
                                    OutlinedButton.icon(
                                        icon:
                                            const Icon(Icons.currency_exchange),
                                        label: const Text('Yêu cầu hoàn tiền'),
                                        onPressed: () => _requestRefund(
                                            bookingId,
                                            booking.bookingCode,
                                            gateway)),
                                ],
                              )),
                      ]),
                );
              },
            );
          },
        ),
      );
}
