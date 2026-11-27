import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../data/booking_repository.dart';
import '../domain/entities/booking.dart';
import 'payment_page.dart';

class VNPayPaymentPage extends StatefulWidget {
  const VNPayPaymentPage({
    super.key,
    required this.booking,
    this.repository = const BookingRepository(),
  });

  final BookingResult booking;
  final BookingRepository repository;

  @override
  State<VNPayPaymentPage> createState() => _VNPayPaymentPageState();
}

class _VNPayPaymentPageState extends State<VNPayPaymentPage> {
  bool _busy = false;
  bool _closed = false;
  String? _message;
  Map<String, String>? _returnParams;

  int get _orderId => widget.booking.orderId;

  bool _updateStatus(Map<String, dynamic> data) {
    if (!mounted) return true;
    if ('${data['order_id']}' != '$_orderId') {
      throw Exception('Kết quả thanh toán không khớp đơn đặt tour.');
    }
    final orderStatus = data['order_payment_status'];
    if (orderStatus == 'paid') {
      Navigator.pushReplacement(
          context,
          MaterialPageRoute<void>(
            builder: (_) => BookingSuccessPage(booking: widget.booking),
          ));
      return true;
    }
    final expiresAt = DateTime.tryParse('${data['expires_at']}');
    final expired = expiresAt != null && !expiresAt.isAfter(DateTime.now());
    final cancelled = data['cancelled'] == true ||
        ['cancelled', 'canceled', 'refunded'].contains(orderStatus);
    setState(() {
      _closed = cancelled || expired || data['needs_review'] == true;
      _message = data['needs_review'] == true
          ? 'Giao dịch đang được đối soát.'
          : cancelled
              ? 'Đơn đã hủy hoặc đã hoàn tiền.'
              : expired
                  ? 'Đơn đã hết thời gian thanh toán.'
                  : data['payment_status'] == 'failed'
                      ? 'Giao dịch thất bại. Bạn có thể thử lại.'
                      : 'Đơn đang chờ thanh toán.';
    });
    return _closed;
  }

  Future<Map<String, dynamic>> _status() async {
    final params = _returnParams;
    if (params != null) {
      final result = await widget.repository.confirmVNPay(params);
      _returnParams = null;
      return result;
    }
    return widget.repository.vnpayStatus(_orderId);
  }

  Future<void> _run({required bool checkout}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final current = await _status();
      if (_updateStatus(current) || !checkout) return;
      final data = current['payment_status'] == 'pending' &&
              current['payment_url'] != null
          ? current
          : await widget.repository.createVNPay(_orderId);
      if (!mounted) return;
      final url = Uri.tryParse('${data['payment_url']}');
      final callback =
          Uri.tryParse(url?.queryParameters['vnp_ReturnUrl'] ?? '');
      final txnRef = '${data['txn_ref'] ?? ''}';
      if (url == null ||
          url.scheme != 'https' ||
          url.host.isEmpty ||
          callback == null ||
          !['https', 'http'].contains(callback.scheme) ||
          callback.host.isEmpty ||
          txnRef.isEmpty ||
          callback.queryParameters['order_id'] != '$_orderId') {
        throw Exception('Đường dẫn thanh toán VNPay không hợp lệ.');
      }
      _returnParams = await Navigator.push<Map<String, String>>(
        context,
        MaterialPageRoute(
            builder: (_) => _VNPayCheckout(
                  url: url,
                  callback: callback,
                  txnRef: txnRef,
                )),
      );
      if (!mounted) return;
      _updateStatus(await _status());
    } catch (error) {
      if (mounted) {
        setState(() => _message = '$error'.replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Thanh toán VNPay Sandbox')),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          Text('Mã đơn: ${widget.booking.bookingCode}'),
          Text('Tổng thanh toán: ${widget.booking.total} đ'),
          const SizedBox(height: 16),
          if (_message != null) Text(_message!),
          if (_busy) const LinearProgressIndicator(),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy || _closed ? null : () => _run(checkout: true),
            child: const Text('Mở cổng thanh toán VNPay'),
          ),
          OutlinedButton(
            onPressed: _busy ? null : () => _run(checkout: false),
            child: const Text('Kiểm tra trạng thái'),
          ),
        ]),
      );
}

class _VNPayCheckout extends StatefulWidget {
  const _VNPayCheckout(
      {required this.url, required this.callback, required this.txnRef});

  final Uri url;
  final Uri callback;
  final String txnRef;

  @override
  State<_VNPayCheckout> createState() => _VNPayCheckoutState();
}

class _VNPayCheckoutState extends State<_VNPayCheckout> {
  late final WebViewController _controller;
  String? _error;
  bool _returned = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController();
    _open();
  }

  Future<void> _open() async {
    try {
      await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await _controller.setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (request) {
          final uri = Uri.tryParse(request.url);
          final callback = widget.callback;
          if (uri == null) return NavigationDecision.prevent;
          if (request.isMainFrame &&
              uri.scheme == callback.scheme &&
              uri.authority == callback.authority &&
              uri.path == callback.path) {
            final params = uri.queryParameters;
            if (!_returned && mounted) {
              if (params['order_id'] == callback.queryParameters['order_id'] &&
                  params['vnp_TxnRef'] == widget.txnRef &&
                  (params['vnp_SecureHash']?.isNotEmpty ?? false)) {
                _returned = true;
                Navigator.pop(context, params);
              } else {
                setState(
                    () => _error = 'Không đọc được kết quả trả về của VNPay.');
              }
            }
            return NavigationDecision.prevent;
          }
          return uri.scheme == 'https'
              ? NavigationDecision.navigate
              : NavigationDecision.prevent;
        },
        onWebResourceError: (error) {
          if (mounted && error.isForMainFrame == true && !_returned) {
            setState(() => _error = 'Không tải được trang VNPay.');
          }
        },
      ));
      if (mounted) await _controller.loadRequest(widget.url);
    } catch (_) {
      if (mounted) setState(() => _error = 'Không mở được trang VNPay.');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Cổng thanh toán VNPay')),
        body: _error == null
            ? WebViewWidget(controller: _controller)
            : Center(child: Text(_error!)),
      );
}
