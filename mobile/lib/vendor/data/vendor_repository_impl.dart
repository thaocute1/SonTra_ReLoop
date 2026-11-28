import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/vendor_repository.dart';

class VendorRepositoryImpl implements VendorRepository {
  VendorRepositoryImpl({http.Client? client})
      : _client = client ?? http.Client();
  final http.Client _client;
  Future<void>? _refreshing;

  Future<void> _refresh() async {
    final refresh = AuthSession.refreshToken;
    if (refresh == null) {
      throw Exception('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    final response = await _client
        .post(Uri.parse('${Appconfig.accountsBaseUrl}/token/refresh/'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({'refresh': refresh}))
        .timeout(const Duration(seconds: 20));
    if (AuthSession.refreshToken != refresh) {
      throw Exception('Phiên đăng nhập đã thay đổi.');
    }
    if (response.statusCode != 200) {
      throw Exception('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    final value = vendorRecord(jsonDecode(utf8.decode(response.bodyBytes)));
    if (value['access'] is! String) {
      throw Exception('Không thể gia hạn phiên đăng nhập.');
    }
    AuthSession.accessToken = value['access'] as String;
    if (value['refresh'] is String) {
      AuthSession.refreshToken = value['refresh'] as String;
    }
  }

  @override
  Future<dynamic> request(String path,
      {String method = 'GET',
      VendorRecord? body,
      Map<String, String>? query}) async {
    return _request(path,
        method: method, body: body, query: query, retry: true);
  }

  Future<dynamic> _request(String path,
      {required String method,
      VendorRecord? body,
      Map<String, String>? query,
      required bool retry}) async {
    final publicRegistration = path == 'vendors/register/' && method == 'POST';
    if (!publicRegistration && !AuthSession.isVendor) {
      throw Exception('Vui lòng đăng nhập bằng tài khoản đối tác.');
    }
    final uri = Uri.parse('${Appconfig.apiBaseUrl}/$path')
        .replace(queryParameters: query);
    final req = http.Request(method, uri)
      ..headers.addAll(publicRegistration
          ? {'Content-Type': 'application/json'}
          : AuthSession.headers);
    if (body != null) req.body = jsonEncode(body);
    final res = await http.Response.fromStream(
            await _client.send(req).timeout(const Duration(seconds: 20)))
        .timeout(const Duration(seconds: 20));
    if (res.statusCode == 401 && retry && !publicRegistration) {
      try {
        await (_refreshing ??= _refresh());
      } finally {
        _refreshing = null;
      }
      return _request(path,
          method: method, body: body, query: query, retry: false);
    }
    dynamic decoded;
    try {
      decoded = res.bodyBytes.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      throw Exception('Máy chủ trả về dữ liệu không hợp lệ.');
    }
    final data = vendorRecord(decoded);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(data['errors'] ??
          data['detail'] ??
          data['message'] ??
          'Không thể thực hiện thao tác (${res.statusCode}).');
    }
    return data.containsKey('data') ? data['data'] : decoded;
  }

  @override
  void close() => _client.close();
}
