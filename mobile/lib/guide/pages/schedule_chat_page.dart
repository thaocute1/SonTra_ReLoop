import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../domain/trip.dart';

class ScheduleChatPage extends StatefulWidget {
  const ScheduleChatPage({super.key, required this.scheduleId});

  final int scheduleId;

  @override
  State<ScheduleChatPage> createState() => _ScheduleChatPageState();
}

class _ScheduleChatPageState extends State<ScheduleChatPage> {
  final _draft = TextEditingController();
  final _client = http.Client();
  final _messages = <int, Json>{};
  late final Timer _poll;
  int? _nextBefore;
  String? _title;
  String? _error;
  bool _loading = false;
  bool _sending = false;

  Uri get _url => Uri.parse(Appconfig.scheduleChatUrl(widget.scheduleId));

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed &&
          ModalRoute.of(context)?.isCurrent == true) {
        _load();
      }
    });
  }

  @override
  void dispose() {
    _poll.cancel();
    _client.close();
    _draft.dispose();
    super.dispose();
  }

  Json _data(http.Response response) {
    if ([401, 403, 404].contains(response.statusCode) && mounted) {
      setState(() {
        _messages.clear();
        _nextBefore = null;
        _title = null;
      });
    }
    if (response.statusCode >= 500) {
      throw Exception('Máy chủ chat đang gặp sự cố. Vui lòng thử lại.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String? message;
      try {
        final json = jsonDecode(utf8.decode(response.bodyBytes));
        if (json is Map) {
          final error = json['error'];
          final detail =
              json['detail'] ?? (error is Map ? error['detail'] : null);
          if (detail is String) message = detail;
        }
      } on FormatException {
        // The backend may be temporarily unavailable and return HTML.
      }
      throw Exception(message ?? 'Không kết nối được với nhóm chat.');
    }
    final json = jsonDecode(utf8.decode(response.bodyBytes)) as Map;
    return Map<String, dynamic>.from(json['data'] as Map);
  }

  Future<void> _load({int? before}) async {
    if (_loading || !mounted) return;
    setState(() => _loading = true);
    try {
      final url = before == null
          ? _url
          : _url.replace(queryParameters: {'before': '$before'});
      final response = await _client
          .get(url, headers: AuthSession.headers)
          .timeout(const Duration(seconds: 12));
      if (!mounted) return;
      final page = _data(response);
      final messages = records(page['messages']);
      setState(() {
        if (_messages.isEmpty || before != null) {
          _nextBefore = page['next_before'] as int?;
        }
        for (final message in messages) {
          _messages[integer(message['id'])] = message;
        }
        _title = text(page['title']);
        _error = null;
      });
    } catch (error) {
      if (mounted) {
        setState(() => _error = '$error'.replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final content = _draft.text.trim();
    if (_sending || _title == null || content.isEmpty) return;
    setState(() => _sending = true);
    try {
      final response = await _client
          .post(
            _url,
            headers: AuthSession.headers,
            body: jsonEncode({'content': content}),
          )
          .timeout(const Duration(seconds: 12));
      if (!mounted) return;
      _data(response);
      _draft.clear();
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('$error'.replaceFirst('Exception: ', '')),
        ));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ids = _messages.keys.toList()..sort((a, b) => b.compareTo(a));
    final older = _nextBefore;
    return Scaffold(
      appBar: AppBar(title: Text(_title ?? 'Chat đoàn'), actions: [
        IconButton(
            onPressed: _loading ? null : () => _load(),
            icon: const Icon(Icons.refresh),
            tooltip: 'Cập nhật tin nhắn'),
      ]),
      body: SafeArea(
          child: Column(children: [
        if (_error != null)
          Padding(padding: const EdgeInsets.all(12), child: Text(_error!)),
        if (_loading && _title == null) const LinearProgressIndicator(),
        Expanded(
          child: ids.isEmpty && _title != null
              ? const Center(
                  child: Text('Chưa có tin nhắn. Hãy chào mọi người!'))
              : ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.all(12),
                  itemCount: ids.length + (older == null ? 0 : 1),
                  itemBuilder: (context, index) {
                    if (index == ids.length) {
                      return TextButton(
                          onPressed:
                              _loading ? null : () => _load(before: older),
                          child: const Text('Xem tin cũ hơn'));
                    }
                    final message = _messages[ids[index]]!;
                    final mine = message['is_mine'] == true;
                    final date = DateTime.tryParse(text(message['created_at']))
                        ?.toLocal();
                    final stamp = date == null
                        ? ''
                        : '${MaterialLocalizations.of(context).formatShortDate(date)} '
                            '${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(date))}';
                    return Align(
                      alignment:
                          mine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Card(
                          child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(mine ? 'Bạn' : text(message['sender_name']),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold)),
                              SelectableText(text(message['content'])),
                              if (stamp.isNotEmpty)
                                Text(stamp,
                                    style:
                                        Theme.of(context).textTheme.labelSmall),
                            ]),
                      )),
                    );
                  },
                ),
        ),
        if (_title != null)
          Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                Expanded(
                    child: TextField(
                  hintLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
                  controller: _draft,
                  enabled: !_sending,
                  minLines: 1,
                  maxLines: 4,
                  maxLength: 2000,
                  decoration: const InputDecoration(
                      hintText: 'Nhắn với đoàn', counterText: ''),
                )),
                IconButton(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send),
                    tooltip: 'Gửi tin nhắn'),
              ])),
      ])),
    );
  }
}
