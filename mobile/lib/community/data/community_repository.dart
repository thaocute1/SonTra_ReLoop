import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/entities/community_post.dart';
import '../domain/repositories/community_repository.dart';

class CommunityRepositoryImpl implements CommunityRepository {
  const CommunityRepositoryImpl({http.Client? client}) : _client = client;

  final http.Client? _client;

  Future<CommunityPost> toggleLike(CommunityPost post) async {
    final send = _client?.post ?? http.post;
    final response = await send(
      Uri.parse('${Appconfig.communityPostsUrl}${post.id}/like/'),
      headers: AuthSession.headers,
    ).timeout(const Duration(seconds: 15));
    final data = _read(response, 'Không thể thả tim. Vui lòng thử lại.');
    if (data is! Map ||
        data['is_liked'] is! bool ||
        data['likes_count'] is! num) {
      throw Exception('Dữ liệu tương tác không hợp lệ.');
    }
    return post.withInteractions(
      isLiked: data['is_liked'] as bool,
      likes: (data['likes_count'] as num).toInt(),
    );
  }

  Future<CommunityComment> addComment(int postId, String content) async {
    if (content.trim().isEmpty) throw Exception('Vui lòng nhập bình luận.');
    final send = _client?.post ?? http.post;
    final response = await send(
      Uri.parse('${Appconfig.communityPostsUrl}$postId/comments/'),
      headers: AuthSession.headers,
      body: jsonEncode({'content': content.trim()}),
    ).timeout(const Duration(seconds: 15));
    final data = _read(response, 'Không thể gửi bình luận. Vui lòng thử lại.');
    if (data is! Map<String, dynamic>) {
      throw Exception('Máy chủ chưa xác nhận bình luận.');
    }
    return CommunityComment.fromJson(data);
  }

  @override
  Future<List<CommunityPost>> getPosts() async {
    final get = _client?.get ?? http.get;
    final response = await get(
      Uri.parse(Appconfig.communityPostsUrl),
      headers: AuthSession.headers,
    ).timeout(const Duration(seconds: 15));
    final data = _read(response, 'Không thể tải bảng tin cộng đồng.');
    if (data is! List) throw Exception('Dữ liệu bảng tin không hợp lệ.');
    return data
        .whereType<Map<String, dynamic>>()
        .map(CommunityPost.fromJson)
        .toList();
  }

  Future<CommunityPost> createPost(
      {required String title,
      required String content,
      Uint8List? image}) async {
    final request = http.MultipartRequest(
        'POST', Uri.parse('${Appconfig.communityPostsUrl}create/'))
      ..headers.addAll(Map.of(AuthSession.headers)..remove('Content-Type'))
      ..fields.addAll(
          {'title': title, 'content': content, 'post_type': 'user_story'});
    if (image != null) {
      request.files.add(http.MultipartFile.fromBytes('image', image,
          filename: 'community-photo'));
    }
    final client = _client ?? http.Client();
    try {
      final response = await client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(const Duration(seconds: 35));
      final data = _read(response, 'Không thể gửi bài viết. Vui lòng thử lại.');
      if (data is! Map<String, dynamic>) {
        throw Exception('Máy chủ chưa xác nhận bài viết.');
      }
      return CommunityPost.fromJson(data);
    } finally {
      if (_client == null) client.close();
    }
  }

  dynamic _read(http.Response response, String fallback) {
    if (response.statusCode == 401 || response.statusCode == 403) {
      throw Exception('Vui lòng đăng nhập lại để tiếp tục.');
    }
    if (response.statusCode >= 500) throw Exception(fallback);
    final dynamic body;
    try {
      body = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw Exception(fallback);
    }
    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        body is Map) {
      return body['data'];
    }
    final errors =
        body is Map ? body['errors'] ?? body['error'] ?? body['message'] : null;
    throw Exception(_firstMessage(errors) ?? fallback);
  }

  String? _firstMessage(dynamic value) {
    if (value is String && value.isNotEmpty) return value;
    final entries = value is Map ? value.values : value;
    if (entries is Iterable) {
      for (final entry in entries) {
        final message = _firstMessage(entry);
        if (message != null) return message;
      }
    }
    return null;
  }
}
