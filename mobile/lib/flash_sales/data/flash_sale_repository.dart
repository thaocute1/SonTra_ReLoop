import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/constants/app_config.dart';

class FlashSaleRepository {
  const FlashSaleRepository();

  Future<Map<String, dynamic>> getActiveSession() async {
    final response = await http
        .get(Uri.parse(Appconfig.activeFlashSaleUrl))
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải Flash Sale.');
    }
    final body = jsonDecode(response.body);
    final data = body is Map ? body['data'] : null;
    return data is Map ? Map<String, dynamic>.from(data) : const {};
  }
}
