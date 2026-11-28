import 'package:flutter/material.dart';

import '../data/community_repository.dart';
import '../domain/entities/community_post.dart';
import '../domain/usecases/get_community_posts_use_case.dart';
import 'community_compose_page.dart';
import 'community_post_detail_page.dart';

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

  Future<void> _compose() async {
    final post = await Navigator.of(context).push<CommunityPost>(
      MaterialPageRoute(
          builder: (_) => CommunityComposePage(repository: widget.repository)),
    );
    if (!mounted || post == null) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(post.isPending
            ? 'Đã gửi bài. Bài viết đang chờ duyệt.'
            : 'Đã đăng bài chia sẻ.')));
    await _reload();
  }

  Future<void> _openPost(CommunityPost post) async {
    await Navigator.of(context).push<void>(MaterialPageRoute(
      builder: (_) =>
          CommunityPostDetailPage(post: post, repository: widget.repository),
    ));
    if (mounted) await _reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        appBar: AppBar(
          backgroundColor: const Color(0xFFF8FAF8),
          title: const Text('Chia sẻ cộng đồng',
              style: TextStyle(
                  color: Color(0xFF26332D), fontWeight: FontWeight.w800)),
        ),
        body: RefreshIndicator(
          onRefresh: _reload,
          child: FutureBuilder<List<CommunityPost>>(
            future: _posts,
            builder: (context, snapshot) {
              final posts = snapshot.data ?? const <CommunityPost>[];
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  FilledButton.icon(
                      onPressed: _compose,
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Viết bài chia sẻ')),
                  const SizedBox(height: 14),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const Center(child: CircularProgressIndicator())
                  else if (snapshot.hasError) ...[
                    const Center(
                        child: Text('Không thể tải bảng tin cộng đồng.')),
                    TextButton(
                        onPressed: _reload, child: const Text('Thử lại')),
                  ] else if (posts.isEmpty)
                    const Center(child: Text('Chưa có bài viết cộng đồng.'))
                  else
                    ...posts.map((post) =>
                        _PostCard(post: post, onTap: () => _openPost(post))),
                ],
              );
            },
          ),
        ),
      );
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post, required this.onTap});

  final CommunityPost post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 14),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
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
                          color: Color(0xFF26332D),
                          fontWeight: FontWeight.w800)),
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
                    style: const TextStyle(
                        color: Color(0xFF65736C), height: 1.35)),
                const SizedBox(height: 8),
                Text(
                    '${post.location}  ·  ${post.isLiked ? '♥' : '♡'} ${post.likes}  ·  '
                    '💬 ${post.comments}',
                    style: const TextStyle(
                        color: Color(0xFF7A8781), fontSize: 10)),
              ],
            ),
          ),
        ),
      );
}
