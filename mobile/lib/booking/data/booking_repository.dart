import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/entities/booking.dart';

class BookingRepository {
  const BookingRepository({http.Client? client}) : _client = client;

  final http.Client? _client;

  Future<BookingResult> createBooking(BookingRequest request) async {
    final post = _client?.post ?? http.post;
    final response = await post(Uri.parse(Appconfig.bookingUrl),
        headers: AuthSession.headers,
        body: jsonEncode({
          'tour_id': request.tourId,
          if (request.campaignItemId != null)
            'campaign_item_id': request.campaignItemId,
          'schedule_id': request.scheduleId,
          'adults_count': request.adults,
          'children_count': request.children,
          'customer_name': request.name,
          'customer_phone': request.phone,
          'customer_email': request.email,
          'pickup_location': request.pickupLocation,
          'payment_method': request.payment.name,
        })).timeout(const Duration(seconds: 30));
    _check(response);
    return BookingResult.fromJson(_data(response),
        scheduleId: int.tryParse(request.scheduleId) ?? 0);
  }

  Future<Map<String, dynamic>> createPaymentLink(int orderId) async {
    final post = _client?.post ?? http.post;
    final response = await post(Uri.parse(Appconfig.payosCreateUrl),
            headers: AuthSession.headers,
            body: jsonEncode({'order_id': orderId}))
        .timeout(const Duration(seconds: 30));
    _check(response);
    final body = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    return Map<String, dynamic>.from(body['data'] as Map);
  }

  Future<String> checkPayment(int orderCode) async {
    final get = _client?.get ?? http.get;
    final response = await get(Uri.parse(Appconfig.payosStatusUrl(orderCode)),
            headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    return '${body['payment_status'] ?? 'PENDING'}';
  }

  Future<Map<String, dynamic>> vnpayStatus(int orderId) async {
    final get = _client?.get ?? http.get;
    final response = await get(Uri.parse(Appconfig.vnpayStatusUrl(orderId)),
            headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    return _data(response);
  }

  Future<Map<String, dynamic>> createVNPay(int orderId) =>
      _postData(Appconfig.vnpayCreateUrl, {'order_id': orderId});

  Future<Map<String, dynamic>> confirmVNPay(Map<String, String> params) =>
      _postData(Appconfig.vnpayReturnUrl, params);

  Future<Map<String, dynamic>> _postData(
      String url, Map<String, dynamic> body) async {
    final post = _client?.post ?? http.post;
    final response = await post(Uri.parse(url),
            headers: AuthSession.headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 20));
    return _data(response);
  }

  Map<String, dynamic> _data(http.Response response) {
    _check(response);
    final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map;
    return Map<String, dynamic>.from(body['data'] as Map);
  }

  void _check(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      dynamic body;
      try {
        body = jsonDecode(utf8.decode(response.bodyBytes));
      } on FormatException {
        throw Exception(
            'Máy chủ đang gặp sự cố (${response.statusCode}). Vui lòng thử lại.');
      }
      final nested = body is Map ? body['error'] : null;
      final message = body is Map
          ? body['message'] ??
              body['detail'] ??
              (nested is Map ? nested['detail'] : null)
          : null;
      throw Exception(
          message ?? 'Không thể xử lý yêu cầu (${response.statusCode}).');
    }
  }
}
