import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../data/community_repository.dart';
import '../domain/entities/community_post.dart';

class CommunityComposePage extends StatefulWidget {
  const CommunityComposePage({super.key, required this.repository});

  final CommunityRepositoryImpl repository;

  @override
  State<CommunityComposePage> createState() => _CommunityComposePageState();
}

class _CommunityComposePageState extends State<CommunityComposePage> {
  final _title = TextEditingController();
  final _content = TextEditingController();
  final _picker = ImagePicker();
  Uint8List? _photo;
  String? _error;
  bool _picking = false;
  bool _sending = false;

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    if (_picking || _sending) return;
    setState(() {
      _picking = true;
      _error = null;
    });
    try {
      final file = await _picker.pickImage(
          source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 85);
      if (!mounted || file == null) return;
      if (await file.length() > 8 * 1024 * 1024) {
        throw Exception('Hãy chọn ảnh nhỏ hơn hoặc bằng 8 MB.');
      }
      final bytes = await file.readAsBytes();
      if (mounted) setState(() => _photo = bytes);
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Không thể chọn ảnh. Hãy thử lại với ảnh JPG, PNG hoặc WebP.');
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  Future<void> _submit() async {
    if (_picking || _sending) return;
    final content = _content.text.trim();
    if (content.isEmpty && _photo == null) {
      setState(() => _error = 'Hãy nhập nội dung hoặc chọn ảnh để chia sẻ.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final post = await widget.repository.createPost(
          title: _title.text.trim(), content: content, image: _photo);
      if (mounted) Navigator.pop<CommunityPost>(context, post);
    } catch (error) {
      if (mounted) {
        setState(() => _error = '$error'.replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Viết bài chia sẻ')),
        body: SafeArea(
            child: ListView(padding: const EdgeInsets.all(16), children: [
          TextField(
              controller: _title,
              enabled: !_sending,
              maxLength: 200,
              decoration:
                  const InputDecoration(labelText: 'Tiêu đề (không bắt buộc)')),
          const SizedBox(height: 12),
          TextField(
              controller: _content,
              enabled: !_sending,
              minLines: 4,
              maxLines: 10,
              maxLength: 5000,
              decoration: const InputDecoration(
                  labelText: 'Bạn muốn chia sẻ điều gì?',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder())),
          if (_photo case final photo?) ...[
            ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(photo,
                    height: 220,
                    width: double.infinity,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) =>
                        const Text('Định dạng ảnh không được hỗ trợ.'))),
            TextButton.icon(
                onPressed: _sending || _picking
                    ? null
                    : () => setState(() => _photo = null),
                icon: const Icon(Icons.delete_outline),
                label: const Text('Bỏ ảnh')),
          ],
          Wrap(spacing: 8, children: [
            OutlinedButton.icon(
                onPressed: _sending || _picking
                    ? null
                    : () => _pick(ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Chọn ảnh')),
            OutlinedButton.icon(
                onPressed: _sending || _picking
                    ? null
                    : () => _pick(ImageSource.camera),
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text('Chụp ảnh')),
          ]),
          const SizedBox(height: 16),
          const Text(
              'Bài của khách sẽ hiển thị trên bảng tin sau khi được duyệt.'),
          if (_error != null)
            Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error))),
          const SizedBox(height: 12),
          if (_picking || _sending) const LinearProgressIndicator(),
          FilledButton(
              onPressed: _sending || _picking ? null : _submit,
              child: Text(_sending ? 'Đang gửi…' : 'Gửi bài chia sẻ')),
        ])),
      );
}
