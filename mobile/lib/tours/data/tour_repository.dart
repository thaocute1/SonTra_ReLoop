import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/constants/app_config.dart';
import '../domain/entities/tour.dart';
import '../domain/repositories/tour_repository.dart';

class TourRepositoryImpl implements TourRepository {
  const TourRepositoryImpl({http.Client? client}) : _client = client;

  final http.Client? _client;

  @override
  Future<List<Tour>> getTours() async {
    final uri = Uri.parse(Appconfig.toursBaseUrl);
    final response = await (_client ?? http.Client())
        .get(uri)
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải danh sách cung đường.');
    }
    final body = jsonDecode(response.body);
    final data = body is Map<String, dynamic> ? body['data'] : body;
    if (data is! List) return const [];

    return data.whereType<Map<String, dynamic>>().map(Tour.fromJson).toList();
  }

  @override
  Future<Tour> getTour(int id) async {
    final response = await (_client ?? http.Client())
        .get(Uri.parse('${Appconfig.toursBaseUrl}/$id/'))
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải thông tin cung đường.');
    }
    final body = jsonDecode(response.body);
    final data = body is Map<String, dynamic> ? body['data'] : body;
    if (data is! Map<String, dynamic>) {
      throw Exception('Dữ liệu cung đường không hợp lệ.');
    }
    return Tour.fromJson(data);
  }
}
