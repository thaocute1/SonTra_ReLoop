import '../entities/community_post.dart';

abstract interface class CommunityRepository {
  Future<List<CommunityPost>> getPosts();
}
