import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/health_profile.dart';

class HealthRepository {
  const HealthRepository({http.Client? client}) : _client = client;
  final http.Client? _client;
  Future<HealthProfile> load() async {
    final get = _client?.get ?? http.get;
    return _read(
        await get(Uri.parse(Appconfig.profileUrl), headers: AuthSession.headers)
            .timeout(const Duration(seconds: 15)));
  }

  Future<HealthProfile> save(HealthProfile profile) async {
    final patch = _client?.patch ?? http.patch;
    return _read(await patch(Uri.parse(Appconfig.profileUrl),
            headers: AuthSession.headers, body: jsonEncode(profile.toJson()))
        .timeout(const Duration(seconds: 15)));
  }

  HealthProfile _read(http.Response response) {
    if (response.statusCode == 401) {
      throw Exception('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      throw Exception('Máy chủ trả về dữ liệu không hợp lệ.');
    }
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        body is! Map) {
      throw Exception(body is Map
          ? body['detail'] ?? body['message'] ?? body.toString()
          : 'Không thể cập nhật hồ sơ sức khỏe.');
    }
    return HealthProfile(
        Map<String, dynamic>.from(body['user'] is Map ? body['user'] : body));
  }
}
