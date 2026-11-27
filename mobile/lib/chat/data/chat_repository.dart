import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../auth/data/services/auth_session.dart';
import '../../core/constants/app_config.dart';
import '../../tours/domain/entities/tour.dart';

class ChatException implements Exception {
  const ChatException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ChatMessage {
  const ChatMessage(
      {required this.text, required this.isUser, this.tours = const []});
  final String text;
  final bool isUser;
  final List<ChatTour> tours;

  bool get hasContent => text.isNotEmpty || tours.isNotEmpty;
}

class ChatTour {
  const ChatTour({required this.tour, this.price, this.rating});

  final Tour tour;
  final int? price;
  final double? rating;

  static List<ChatTour> fromBlocks(Object? blocks) {
    if (blocks is! List) return const [];
    final tours = <int, ChatTour>{};
    for (final block in blocks.whereType<Map>()) {
      final items = block['items'];
      if (block['type'] != 'tour_list' || items is! List) continue;
      for (final item in items.whereType<Map<String, dynamic>>()) {
        final id = int.tryParse('${item['id']}');
        if (id == null || id <= 0 || tours.containsKey(id)) continue;
        final price = _number(item['price'])?.round();
        final image = item['cover_image_url'];
        final imageRef = image is String && image.trim().isNotEmpty
            ? Uri.tryParse(image.trim())
            : null;
        final imageUri = imageRef == null
            ? null
            : Uri.parse(Appconfig.baseUrl).resolveUri(imageRef);
        tours[id] = ChatTour(
          tour: Tour.fromJson({
            'id': id,
            'title': item['title'],
            'description': item['description'],
            'cover_image_url':
                imageUri?.scheme == 'https' || imageUri?.scheme == 'http'
                    ? imageUri.toString()
                    : '',
            'difficulty_level': item['difficulty_level'],
            'difficulty_label':
                item['difficulty_level'] == null ? 'Chưa cập nhật' : null,
            'duration_hours': _number(item['duration_hours']),
            'price': price,
          }),
          price: price,
          rating: _number(item['avg_rating']),
        );
      }
    }
    return tours.values.toList();
  }

  static double? _number(Object? value) {
    final number = double.tryParse('$value');
    return number != null && number.isFinite && number >= 0 ? number : null;
  }
}

class ChatRepository {
  const ChatRepository({http.Client? client}) : _client = client;
  final http.Client? _client;

  Future<ChatMessage> send(String message, String sessionId) async {
    final post = _client?.post ?? http.post;
    final data = await _request(() => post(Uri.parse(Appconfig.chatbotChatUrl),
        headers: AuthSession.headers,
        body:
            jsonEncode({'message': message.trim(), 'session_id': sessionId})));
    final reply = ChatMessage(
        text: '${data['answer'] ?? ''}'.trim(),
        isUser: false,
        tours: ChatTour.fromBlocks(data['blocks']));
    if (!reply.hasContent) {
      throw const ChatException('Trợ lý chưa có phản hồi. Vui lòng thử lại.');
    }
    return reply;
  }

  Future<List<ChatMessage>> history(String sessionId) async {
    final get = _client?.get ?? http.get;
    final data = await _request(() => get(
        Uri.parse(Appconfig.chatbotHistoryUrl)
            .replace(queryParameters: {'session_id': sessionId}),
        headers: AuthSession.headers));
    return (data['messages'] as List? ?? [])
        .whereType<Map>()
        .map((m) => ChatMessage(
            text: '${m['content'] ?? ''}'.trim(),
            isUser: m['role'] == 'user',
            tours: m['role'] == 'assistant'
                ? ChatTour.fromBlocks(m['blocks'])
                : const []))
        .where((message) => message.hasContent)
        .toList();
  }

  Future<Map<String, dynamic>> _request(
      Future<http.Response> Function() call) async {
    if (AuthSession.accessToken?.isNotEmpty != true) {
      throw const ChatException('Vui lòng đăng nhập để trò chuyện với trợ lý.');
    }
    http.Response response;
    try {
      response = await call().timeout(const Duration(seconds: 150));
    } on TimeoutException {
      throw const ChatException('Trợ lý phản hồi chậm. Vui lòng thử lại sau.');
    } on http.ClientException {
      throw const ChatException('Không thể kết nối. Vui lòng kiểm tra mạng.');
    }
    if (response.statusCode == 401) {
      throw const ChatException(
          'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    if (response.statusCode == 429) {
      throw const ChatException('Bạn gửi quá nhanh. Vui lòng chờ một chút.');
    }
    Map<String, dynamic> data;
    try {
      data = Map<String, dynamic>.from(
          jsonDecode(utf8.decode(response.bodyBytes)) as Map);
    } catch (_) {
      throw const ChatException('Máy chủ chưa sẵn sàng. Vui lòng thử lại sau.');
    }
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        data['ok'] != true) {
      throw const ChatException(
          'Trợ lý tạm thời không khả dụng. Vui lòng thử lại sau.');
    }
    return data;
  }
}
