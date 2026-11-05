import 'package:flutter/material.dart';

import '../data/booking_repository.dart';
import '../domain/entities/booking.dart';

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key, required this.booking});

  final BookingResult booking;

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  Map<String, dynamic>? _payment;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _createPayment();
  }

  @override
  Widget build(BuildContext context) {
    final qr = '${_payment?['qrCode'] ?? widget.booking.qrCode}';
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
          title: const Text('Chi tiết thanh toán'),
          backgroundColor: const Color(0xFFF8FAF8)),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Text(widget.booking.bookingCode,
              style:
                  const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          const Text('Quét mã QR để thanh toán bằng VietQR',
              style: TextStyle(color: Color(0xFF718078))),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
                color: const Color(0xFFE6EFEB),
                borderRadius: BorderRadius.circular(18)),
            child: qr.isEmpty
                ? const Center(child: Text('Đang tạo mã thanh toán...'))
                : Image.network(qr,
                    height: 230,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => SelectableText(qr)),
          ),
          const SizedBox(height: 16),
          Text('Tổng thanh toán: ${_money(widget.booking.total)}',
              style: const TextStyle(
                  color: Color(0xFF4E7567),
                  fontSize: 18,
                  fontWeight: FontWeight.w800)),
          if (_error != null)
            Padding(
                padding: const EdgeInsets.only(top: 10),
                child:
                    Text(_error!, style: const TextStyle(color: Colors.red))),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _loading ? null : _checkStatus,
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF4E7567)),
            child: Text(_loading ? 'Đang tải...' : 'Tôi đã thanh toán'),
          ),
        ],
      ),
    );
  }

  Future<void> _createPayment() async {
    try {
      final result = await const BookingRepository()
          .createPaymentLink(widget.booking.orderId);
      if (mounted) setState(() => _payment = result);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkStatus() async {
    if (widget.booking.paymentOrderCode == 0) {
      _showSuccess();
      return;
    }
    setState(() => _loading = true);
    try {
      final status = await const BookingRepository()
          .checkPayment(widget.booking.paymentOrderCode);
      if (status.toUpperCase() == 'PAID') {
        _showSuccess();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Trạng thái hiện tại: $status')));
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSuccess() {
    Navigator.pushReplacement(
        context,
        MaterialPageRoute<void>(
            builder: (_) => BookingSuccessPage(booking: widget.booking)));
  }

  String _money(int value) =>
      '${value.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
}

class BookingSuccessPage extends StatelessWidget {
  const BookingSuccessPage({super.key, required this.booking});

  final BookingResult booking;

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const CircleAvatar(
                    radius: 32,
                    backgroundColor: Color(0xFFE6EFEB),
                    child:
                        Icon(Icons.check, color: Color(0xFF4E7567), size: 34)),
                const SizedBox(height: 16),
                const Text('Thanh toán thành công!',
                    style:
                        TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('Mã đơn: ${booking.bookingCode}'),
                const SizedBox(height: 24),
                FilledButton(
                    onPressed: () =>
                        Navigator.popUntil(context, (route) => route.isFirst),
                    child: const Text('Về trang chủ')),
              ]),
            ),
          ),
        ),
      );
}
