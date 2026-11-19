import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../auth/data/services/auth_session.dart';
import '../data/chat_repository.dart';
import '../widgets/chat_tour_card.dart';

class ChatSheet extends StatefulWidget {
  const ChatSheet({super.key, this.repository = const ChatRepository()});
  final ChatRepository repository;
  @override
  State<ChatSheet> createState() => _ChatSheetState();
}

class _ChatSheetState extends State<ChatSheet> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <ChatMessage>[];
  String? _sessionId;
  late final String? _owner = AuthSession.userId;
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'chat_session_${_owner ?? 'anonymous'}';
      _sessionId = prefs.getString(key) ??
          'mobile-${DateTime.now().microsecondsSinceEpoch}';
      await prefs.setString(key, _sessionId!);
      final history = await widget.repository.history(_sessionId!);
      if (!mounted || _owner != AuthSession.userId) return;
      setState(() => _messages.addAll(history));
      _scrollToEnd();
    } catch (_) {
      if (mounted) {
        setState(() =>
            _error = 'Chưa tải được lịch sử. Bạn vẫn có thể gửi tin nhắn mới.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (_busy || text.isEmpty) return;
    if (_owner != AuthSession.userId) {
      setState(
          () => _error = 'Phiên đăng nhập đã thay đổi. Vui lòng mở lại chat.');
      return;
    }
    _sessionId ??= 'mobile-${DateTime.now().microsecondsSinceEpoch}';
    setState(() {
      _busy = true;
      _error = null;
      _messages.add(ChatMessage(text: text, isUser: true));
      _input.clear();
    });
    _scrollToEnd();
    try {
      final reply = await widget.repository.send(text, _sessionId!);
      if (!mounted || _owner != AuthSession.userId) return;
      setState(() => _messages.add(reply));
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error is ChatException
              ? error.message
              : 'Không gửi được tin nhắn. Vui lòng thử lại.';
          _messages.removeLast();
          _input.text = text;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        _scrollToEnd();
      }
    }
  }

  void _scrollToEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut);
        }
      });

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding:
            EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * .78,
          child: SafeArea(
              top: false,
              child: Column(children: [
                Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 8, 8),
                    child: Row(children: [
                      const Icon(Icons.chat_bubble_rounded,
                          color: Color(0xFF4E7567)),
                      const SizedBox(width: 10),
                      const Expanded(
                          child: Text('Trợ lý Sơn Trà',
                              style: TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w800))),
                      IconButton(
                          tooltip: 'Đóng chat',
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close)),
                    ])),
                const Divider(height: 1),
                Expanded(
                    child: ListView(
                        controller: _scroll,
                        padding: const EdgeInsets.all(16),
                        children: [
                      const Padding(
                          padding: EdgeInsets.only(bottom: 16),
                          child: Text(
                              'Xin chào! Mình có thể giúp bạn tìm tour, cung đường và thông tin an toàn.',
                              style: TextStyle(color: Color(0xFF718078)))),
                      for (final message in _messages) ...[
                        if (message.text.isNotEmpty)
                          Align(
                              alignment: message.isUser
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(12),
                                  constraints: BoxConstraints(
                                      maxWidth:
                                          MediaQuery.sizeOf(context).width *
                                              .82),
                                  decoration: BoxDecoration(
                                      color: message.isUser
                                          ? const Color(0xFF4E7567)
                                          : const Color(0xFFE6EFEB),
                                      borderRadius: BorderRadius.circular(16)),
                                  child: SelectableText(message.text,
                                      style: TextStyle(
                                          height: 1.45,
                                          color: message.isUser
                                              ? Colors.white
                                              : const Color(0xFF26332D))))),
                        for (final tour in message.tours)
                          ChatTourCard(item: tour),
                      ],
                      if (_busy)
                        const Padding(
                            padding: EdgeInsets.all(8),
                            child: Text('Trợ lý đang xử lý...')),
                    ])),
                if (_error != null)
                  Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(_error!,
                          style: const TextStyle(color: Colors.red))),
                Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                    child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                              child: TextField(
                                  controller: _input,
                                  minLines: 1,
                                  maxLines: 4,
                                  maxLength: 4000,
                                  enabled: !_busy,
                                  keyboardType: TextInputType.multiline,
                                  hintLocales: const [Locale('vi', 'VN')],
                                  enableSuggestions: true,
                                  autocorrect: true,
                                  textCapitalization:
                                      TextCapitalization.sentences,
                                  textInputAction: TextInputAction.send,
                                  onSubmitted: (_) => _send(),
                                  decoration: const InputDecoration(
                                      hintText: 'Nhập câu hỏi...',
                                      counterText: '',
                                      border: OutlineInputBorder()))),
                          IconButton(
                              tooltip: 'Gửi tin nhắn',
                              onPressed: _busy ? null : _send,
                              color: const Color(0xFF4E7567),
                              icon: const Icon(Icons.send_rounded)),
                        ])),
              ])),
        ),
      );
}
