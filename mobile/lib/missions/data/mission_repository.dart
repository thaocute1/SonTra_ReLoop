import 'dart:convert';

import 'package:http/http.dart' as http;

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
  Future<Mission> completeMission(int id) async {
    final response = await (_client ?? http.Client()).post(
      Uri.parse('${Appconfig.challengingBaseUrl}/missions/$id/complete/'),
      headers: AuthSession.headers,
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_message(response.body, 'Không thể xác thực nhiệm vụ.'));
    }
    final decoded = jsonDecode(response.body);
    final task = decoded is Map<String, dynamic> ? decoded['task'] : null;
    if (task is! Map<String, dynamic>) {
      throw Exception('Phản hồi xác thực nhiệm vụ không hợp lệ.');
    }
    return Mission.fromJson(task);
  }

  String _message(String body, String fallback) {
    try {
      final decoded = jsonDecode(body);
      final message =
          decoded is Map<String, dynamic> ? decoded['message'] : null;
      return message is String && message.isNotEmpty ? message : fallback;
    } on FormatException {
      return fallback;
    }
  }
}
