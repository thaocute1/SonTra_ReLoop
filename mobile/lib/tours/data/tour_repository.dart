import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/constants/app_config.dart';
import '../../auth/data/services/auth_session.dart';
import '../domain/entities/tour.dart';
import '../domain/repositories/tour_repository.dart';

class TourRepositoryImpl implements TourRepository {
  const TourRepositoryImpl({http.Client? client}) : _client = client;

  final http.Client? _client;

  @override
  Future<List<Tour>> getTours() async {
    final response = await _get(Uri.parse('${Appconfig.toursBaseUrl}/'));
    final body = _decode(response);
    final data = body is Map<String, dynamic> ? body['data'] : body;
    if (data is! List) {
      throw Exception('Dữ liệu danh sách cung đường không hợp lệ.');
    }

    return data.whereType<Map<String, dynamic>>().map(Tour.fromJson).toList();
  }

  @override
  Future<Tour> getTour(int id) async {
    final response = await _get(Uri.parse('${Appconfig.toursBaseUrl}/$id/'));
    final body = _decode(response);
    final data = body is Map<String, dynamic> ? body['data'] : body;
    if (data is! Map<String, dynamic>) {
      throw Exception('Dữ liệu cung đường không hợp lệ.');
    }
    return Tour.fromJson(data);
  }

  Future<http.Response> _get(Uri uri) async {
    try {
      final get = _client?.get ?? http.get;
      final response = await get(uri, headers: AuthSession.headers)
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 401 || response.statusCode == 403) {
        throw Exception('Phiên đăng nhập không hợp lệ hoặc bạn chưa có quyền '
            'xem cung đường. Vui lòng đăng nhập lại.');
      }
      if (response.statusCode == 404) {
        throw Exception('Không tìm thấy cung đường yêu cầu.');
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
            'Không thể tải cung đường lúc này. Vui lòng thử lại sau.');
      }
      return response;
    } on TimeoutException {
      throw Exception('Kết nối quá thời gian. Vui lòng thử lại.');
    } on http.ClientException {
      throw Exception('Không kết nối được máy chủ. Vui lòng kiểm tra mạng '
          'và thử lại.');
    }
  }

  dynamic _decode(http.Response response) {
    try {
      return jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw Exception('Dữ liệu cung đường không hợp lệ. Vui lòng thử lại sau.');
    }
  }
}
