import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/entities/community_post.dart';
import '../domain/repositories/community_repository.dart';

class CommunityRepositoryImpl implements CommunityRepository {
  const CommunityRepositoryImpl({http.Client? client}) : _client = client;

  final http.Client? _client;

  @override
  Future<List<CommunityPost>> getPosts() async {
    final response = await (_client ?? http.Client()).get(
      Uri.parse('${Appconfig.baseUrl}/api/v1/cms-chatbot/community/posts/'),
      headers: AuthSession.headers,
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không thể tải bảng tin cộng đồng.');
    }
    final decoded = jsonDecode(response.body);
    final data = decoded is Map<String, dynamic> ? decoded['data'] : null;
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(CommunityPost.fromJson)
        .toList();
  }
}
