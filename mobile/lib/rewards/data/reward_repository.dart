import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';

class RewardRepository {
  const RewardRepository();

  Future<List<Map<String, dynamic>>> getRewards() async {
    final response = await http
        .get(Uri.parse(Appconfig.rewardsUrl), headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = jsonDecode(response.body);
    return _maps(body is Map ? body['results'] : body);
  }

  Future<Map<String, dynamic>> getStats() async {
    final response = await http
        .get(Uri.parse(Appconfig.statsUrl), headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  Future<List<Map<String, dynamic>>> getVouchers() async {
    final response = await http
        .get(Uri.parse(Appconfig.vouchersUrl), headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = jsonDecode(response.body);
    return _maps(body is Map ? body['results'] : body);
  }

  Future<Map<String, dynamic>> redeemReward(int voucherId) async {
    final response = await http
        .post(
          Uri.parse('${Appconfig.rewardsUrl}redeem/'),
          headers: AuthSession.headers,
          body: jsonEncode({'voucher_id': voucherId}),
        )
        .timeout(const Duration(seconds: 15));
    _check(response);
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  void _check(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải dữ liệu (${response.statusCode}).');
    }
  }

  List<Map<String, dynamic>> _maps(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }
}
