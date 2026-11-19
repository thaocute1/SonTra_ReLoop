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
          'schedule_id': request.scheduleId,
          'adults_count': request.adults,
          'children_count': request.children,
          'customer_name': request.name,
          'customer_phone': request.phone,
          'customer_email': request.email,
          'pickup_location': request.pickupLocation,
          'payment_method': 'payos',
        })).timeout(const Duration(seconds: 30));
    _check(response);
    final body = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    return BookingResult.fromJson(
        Map<String, dynamic>.from(body['data'] as Map));
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

  void _check(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      dynamic body;
      try {
        body = jsonDecode(response.body);
      } on FormatException {
        throw Exception(
            'Máy chủ đang gặp sự cố (${response.statusCode}). Vui lòng thử lại.');
      }
      final message = body is Map ? body['message'] : null;
      throw Exception(
          message ?? 'Không thể xử lý yêu cầu (${response.statusCode}).');
    }
  }
}
