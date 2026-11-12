import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/entities/mission.dart';
import '../domain/repositories/mission_repository.dart';

class MissionRepositoryImpl implements MissionRepository {
  const MissionRepositoryImpl({http.Client? client}) : _client = client;

  final http.Client? _client;

  @override
  Future<List<Mission>> getMissions() async {
    final response = await (_client ?? http.Client()).get(
      Uri.parse('${Appconfig.challengingBaseUrl}/missions/'),
      headers: AuthSession.headers,
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải danh sách nhiệm vụ.');
    }
    final decoded = jsonDecode(response.body);
    final results = decoded is Map<String, dynamic> ? decoded['results'] : null;
    if (results is! List) return const [];
    return results
        .whereType<Map<String, dynamic>>()
        .map(Mission.fromJson)
        .toList();
  }

  @override
  Future<Mission> completeMission(
    int id, {
    String? proofPath,
    String note = '',
    double? latitude,
    double? longitude,
    double? gpsAccuracy,
  }) async {
    final request = http.MultipartRequest('POST',
        Uri.parse('${Appconfig.challengingBaseUrl}/missions/$id/complete/'));
    request.headers.addAll(Map.of(AuthSession.headers)..remove('Content-Type'));
    request.fields['note'] = note;
    if (latitude != null && longitude != null) {
      request.fields['latitude'] = '$latitude';
      request.fields['longitude'] = '$longitude';
      if (gpsAccuracy != null) {
        request.fields['gps_accuracy_m'] = '$gpsAccuracy';
      }
    }
    if (proofPath != null) {
      final png = proofPath.toLowerCase().endsWith('.png');
      request.files.add(await http.MultipartFile.fromPath(
          'proof_file', proofPath,
          contentType: MediaType('image', png ? 'png' : 'jpeg')));
    }
    final client = _client ?? http.Client();
    final http.Response response;
    try {
      response = await http.Response.fromStream(await client.send(request))
          .timeout(const Duration(seconds: 30));
    } finally {
      if (_client == null) client.close();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_message(response.body, 'Không thể xác thực nhiệm vụ.'));
    }
    final decoded = jsonDecode(response.body);
    final task = decoded is Map<String, dynamic> ? decoded['task'] : null;
    if (task is! Map<String, dynamic>) {
      throw Exception('Phản hồi xác thực nhiệm vụ không hợp lệ.');
    }
    final mission = Mission.fromJson(task);
    AuthSession.notifyPointsChanged();
    return mission;
  }

  String _message(String body, String fallback) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) {
        final error = decoded['message'] ?? decoded['error'];
        if (error is String && error.isNotEmpty) return error;
        if (error is Map && error['detail'] is String) return error['detail'];
      }
      return fallback;
    } on FormatException {
      return fallback;
    }
  }
}
