import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';

class ProfileRepository {
  const ProfileRepository();

  Future<List<Map<String, dynamic>>> getBookings() async {
    final response = await http
        .get(Uri.parse(Appconfig.myBookingsUrl), headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = jsonDecode(response.body);
    final data = body is Map ? body['data'] : body;
    return _maps(data);
  }

  Future<List<Map<String, dynamic>>> getVouchers() async {
    final response = await http
        .get(Uri.parse(Appconfig.vouchersUrl), headers: AuthSession.headers)
        .timeout(const Duration(seconds: 15));
    _check(response);
    final body = jsonDecode(response.body);
    final data = body is Map ? body['results'] : body;
    return _maps(data);
  }

  void _check(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải dữ liệu hồ sơ.');
    }
  }

  List<Map<String, dynamic>> _maps(dynamic value) => value is List
      ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
      : const [];
}
