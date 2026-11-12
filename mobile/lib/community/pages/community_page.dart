import 'package:flutter/material.dart';

import '../data/community_repository.dart';
import '../domain/entities/community_post.dart';
import '../domain/usecases/get_community_posts_use_case.dart';

class CommunityPage extends StatefulWidget {
  const CommunityPage({super.key, CommunityRepositoryImpl? repository})
      : repository = repository ?? const CommunityRepositoryImpl();

  final CommunityRepositoryImpl repository;

  @override
  State<CommunityPage> createState() => _CommunityPageState();
}

class _CommunityPageState extends State<CommunityPage> {
  late Future<List<CommunityPost>> _posts;

  @override
  void initState() {
    super.initState();
    _posts = GetCommunityPostsUseCase(widget.repository)();
  }

  Future<void> _reload() async {
    final request = GetCommunityPostsUseCase(widget.repository)();
    setState(() {
      _posts = request;
    });
    try {
      await request;
    } catch (_) {
      // FutureBuilder displays the error.
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        appBar: AppBar(
          backgroundColor: const Color(0xFFF8FAF8),
          title: const Text('Cộng đồng Xanh',
              style: TextStyle(
                  color: Color(0xFF26332D), fontWeight: FontWeight.w800)),
        ),
        body: RefreshIndicator(
          onRefresh: _reload,
          child: FutureBuilder<List<CommunityPost>>(
            future: _posts,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return const Center(
                    child: Text('Không thể tải bảng tin cộng đồng.'));
              }
              final posts = snapshot.data ?? const <CommunityPost>[];
              if (posts.isEmpty) {
                return const Center(child: Text('Chưa có bài viết cộng đồng.'));
              }
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Bảng xếp hạng Eco-Hero tháng này',
                      style: TextStyle(
                          color: Color(0xFF26332D),
                          fontSize: 16,
                          fontWeight: FontWeight.w800)),
                  const SizedBox(height: 14),
                  ...posts.map((post) => _PostCard(post: post)),
                ],
              );
            },
          ),
        ),
      );
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post});

  final CommunityPost post;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 14),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                CircleAvatar(
                    radius: 16,
                    backgroundColor: const Color(0xFFE6EFEB),
                    child: Text(post.authorInitials,
                        style: const TextStyle(
                            color: Color(0xFF4E7567), fontSize: 10))),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(post.authorName,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF26332D)))),
                Text(post.pointsReward,
                    style: const TextStyle(
                        color: Color(0xFFE47A25), fontSize: 10)),
              ]),
              if (post.title.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(post.title,
                    style: const TextStyle(
                        color: Color(0xFF26332D), fontWeight: FontWeight.w800)),
              ],
              if (post.imageUrl.isNotEmpty) ...[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(post.imageUrl,
                      height: 150,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                ),
              ],
              const SizedBox(height: 8),
              Text(post.content,
                  style:
                      const TextStyle(color: Color(0xFF65736C), height: 1.35)),
              const SizedBox(height: 8),
              Text(
                  '${post.location}  ·  ♡ ${post.likes}  ·  '
                  '💬 ${post.comments}',
                  style:
                      const TextStyle(color: Color(0xFF7A8781), fontSize: 10)),
            ],
          ),
        ),
      );
}
