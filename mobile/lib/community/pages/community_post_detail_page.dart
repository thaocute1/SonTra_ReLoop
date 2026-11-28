import 'package:flutter/material.dart';

import '../data/community_repository.dart';
import '../domain/entities/community_post.dart';

class CommunityPostDetailPage extends StatefulWidget {
  const CommunityPostDetailPage(
      {super.key, required this.post, required this.repository});

  final CommunityPost post;
  final CommunityRepositoryImpl repository;

  @override
  State<CommunityPostDetailPage> createState() =>
      _CommunityPostDetailPageState();
}

class _CommunityPostDetailPageState extends State<CommunityPostDetailPage> {
  late CommunityPost _post = widget.post;
  final _comment = TextEditingController();
  final _commentFocus = FocusNode();
  bool _liking = false;
  bool _sending = false;

  @override
  void dispose() {
    _comment.dispose();
    _commentFocus.dispose();
    super.dispose();
  }

  void _showError(Object error) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(error.toString().replaceFirst('Exception: ', '')),
    ));
  }

  Future<void> _like() async {
    if (_liking) return;
    setState(() => _liking = true);
    try {
      final updated = await widget.repository.toggleLike(_post);
      if (mounted) {
        setState(() => _post = _post.withInteractions(
            isLiked: updated.isLiked, likes: updated.likes));
      }
    } catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _liking = false);
    }
  }

  Future<void> _sendComment() async {
    if (_sending || _comment.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      final comment =
          await widget.repository.addComment(_post.id, _comment.text);
      if (!mounted) return;
      setState(() {
        _post = _post
            .withInteractions(commentItems: [..._post.commentItems, comment]);
        _comment.clear();
      });
      _commentFocus.unfocus();
    } catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Chi tiết bài viết')),
        body: SafeArea(
          child: Column(children: [
            Expanded(
                child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Row(children: [
                  CircleAvatar(child: Text(_post.authorInitials)),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Text(_post.authorName,
                          style: const TextStyle(fontWeight: FontWeight.w700))),
                ]),
                const SizedBox(height: 16),
                if (_post.title.isNotEmpty) ...[
                  Text(_post.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                ],
                if (_post.imageUrl.isNotEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(_post.imageUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('Không thể tải ảnh.'))),
                  ),
                  const SizedBox(height: 16),
                ],
                SelectableText(_post.content,
                    style: const TextStyle(height: 1.5)),
                const SizedBox(height: 12),
                Text(_post.location,
                    style: const TextStyle(color: Color(0xFF65736C))),
                const SizedBox(height: 12),
                Wrap(spacing: 12, children: [
                  TextButton.icon(
                    onPressed: _liking ? null : _like,
                    icon: _liking
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Icon(
                            _post.isLiked
                                ? Icons.favorite
                                : Icons.favorite_border,
                            color: _post.isLiked ? Colors.red : null),
                    label: Text(
                        '${_post.isLiked ? 'Đã thích' : 'Thả tim'} (${_post.likes})'),
                  ),
                  TextButton.icon(
                    onPressed: () => _commentFocus.requestFocus(),
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: Text('Bình luận (${_post.comments})'),
                  ),
                ]),
                const Divider(),
                const SizedBox(height: 8),
                Text('Bình luận (${_post.comments})',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (_post.commentItems.isEmpty)
                  const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Text(
                          'Chưa có bình luận. Hãy chia sẻ cảm nghĩ của bạn!')),
                for (final comment in _post.commentItems)
                  Card(
                      child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(comment.authorName,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text(comment.content,
                              style: const TextStyle(height: 1.4)),
                          if (comment.createdAt.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(comment.createdAt,
                                style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ]),
                  )),
              ],
            )),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Expanded(
                    child: TextField(
                  controller: _comment,
                  focusNode: _commentFocus,
                  enabled: !_sending,
                  hintLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
                  keyboardType: TextInputType.multiline,
                  minLines: 1,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Viết bình luận...',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20)),
                  ),
                )),
                const SizedBox(width: 8),
                ValueListenableBuilder<TextEditingValue>(
                  valueListenable: _comment,
                  builder: (_, value, __) => IconButton(
                    tooltip: 'Gửi bình luận',
                    onPressed: _sending || value.text.trim().isEmpty
                        ? null
                        : _sendComment,
                    icon: _sending
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send),
                  ),
                ),
              ]),
            ),
          ]),
        ),
      );
}
