import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/constants/app_config.dart';
import '../domain/entities/flash_sale.dart';

class FlashSaleRepository {
  const FlashSaleRepository({http.Client? client}) : _client = client;
  final http.Client? _client;

  Future<FlashSaleSession?> getActiveSession() async {
    final get = _client?.get ?? http.get;
    final response = await get(Uri.parse(Appconfig.activeFlashSaleUrl))
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải Flash Sale.');
    }
    final body = jsonDecode(utf8.decode(response.bodyBytes));
    final data = body is Map ? body['data'] : null;
    if (data is Map && data['has_session'] == false) return null;
    final session = data is Map ? data['session'] : null;
    if (session is Map<String, dynamic>) {
      return FlashSaleSession.fromJson(session);
    }
    throw const FormatException('Dữ liệu Flash Sale không hợp lệ.');
  }
}
