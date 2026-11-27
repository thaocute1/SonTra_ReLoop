import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../guide/pages/schedule_chat_page.dart';

import '../data/booking_repository.dart';
import '../domain/entities/booking.dart';

class PaymentPage extends StatefulWidget {
  const PaymentPage(
      {super.key,
      required this.booking,
      this.repository = const BookingRepository()});

  final BookingResult booking;
  final BookingRepository repository;

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
    if (widget.booking.qrCode.isNotEmpty &&
        widget.booking.paymentOrderCode > 0) {
      _payment = {
        'qrCode': widget.booking.qrCode,
        'orderCode': widget.booking.paymentOrderCode
      };
      _loading = false;
    } else {
      _createPayment();
    }
  }

  @override
  Widget build(BuildContext context) {
    final qr = '${_payment?['qrCode'] ?? ''}';
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
                ? Center(
                    child: Text(_loading
                        ? 'Đang tạo mã thanh toán...'
                        : 'Chưa tải được mã thanh toán. Vui lòng thử lại.'))
                : Center(
                    child: QrImageView(
                      data: qr,
                      version: QrVersions.auto,
                      size: 260,
                      padding: const EdgeInsets.all(20),
                      backgroundColor: Colors.white,
                    ),
                  ),
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
          if (qr.isEmpty && !_loading)
            OutlinedButton(
                onPressed: _createPayment,
                child: const Text('Thử tải lại mã QR')),
          FilledButton(
            onPressed: _loading || qr.isEmpty ? null : _checkStatus,
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF4E7567)),
            child: Text(_loading ? 'Đang tải...' : 'Tôi đã thanh toán'),
          ),
        ],
      ),
    );
  }

  Future<void> _createPayment() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result =
          await widget.repository.createPaymentLink(widget.booking.orderId);
      if ('${result['qrCode'] ?? ''}'.isEmpty ||
          (int.tryParse('${result['orderCode']}') ?? 0) <= 0) {
        throw Exception('Dữ liệu thanh toán chưa đầy đủ. Vui lòng thử lại.');
      }
      if (mounted) setState(() => _payment = result);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkStatus() async {
    final orderCode = int.tryParse('${_payment?['orderCode']}') ??
        widget.booking.paymentOrderCode;
    if (orderCode == 0) {
      setState(() => _error = 'Chưa có mã giao dịch để kiểm tra thanh toán.');
      return;
    }
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final status = await widget.repository.checkPayment(orderCode);
      if (!mounted) return;
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
                if (booking.scheduleId > 0)
                  FilledButton.icon(
                    icon: const Icon(Icons.forum_outlined),
                    label: const Text('Vào chat đoàn'),
                    onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              ScheduleChatPage(scheduleId: booking.scheduleId),
                        )),
                  ),
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
