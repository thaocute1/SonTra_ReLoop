import '../entities/community_post.dart';
import '../repositories/community_repository.dart';

class GetCommunityPostsUseCase {
  const GetCommunityPostsUseCase(this._repository);

  final CommunityRepository _repository;

  Future<List<CommunityPost>> call() => _repository.getPosts();
}
