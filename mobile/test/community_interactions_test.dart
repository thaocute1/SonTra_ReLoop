import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/community/data/community_repository.dart';
import 'package:son_tra_trail_quest/community/pages/community_page.dart';

http.Response _response(String body, int status) => http.Response(body, status,
    headers: {'content-type': 'application/json; charset=utf-8'});

void main() {
  testWidgets('opens a story, likes, unlikes, comments and refreshes the feed',
      (tester) async {
    var liked = false;
    final comments = <Map<String, dynamic>>[
      {'id': 'c1', 'author_name': 'Lan', 'content': 'Cảnh đẹp quá!'}
    ];
    final repository =
        CommunityRepositoryImpl(client: MockClient((request) async {
      if (request.url.path.endsWith('/like/')) {
        liked = !liked;
        return _response(
            jsonEncode({
              'data': {
                'is_liked': liked,
                'likes_count': liked ? 1 : 0,
              }
            }),
            200);
      }
      if (request.url.path.endsWith('/comments/')) {
        final body = jsonDecode(request.body);
        expect(body['content'], 'Sơn Trà thật đẹp!');
        final comment = <String, dynamic>{
          'id': 'c2',
          'author_name': 'Nguyễn Ánh',
          'content': body['content']
        };
        comments.add(comment);
        return _response(jsonEncode({'data': comment}), 201);
      }
      return _response(
          jsonEncode({
            'data': [
              {
                'id': 1,
                'title': 'Chuyến đi Sơn Trà',
                'content': 'Nội dung đầy đủ',
                'author_name': 'Minh',
                'author_initials': 'M',
                'is_liked': liked,
                'likes_count': liked ? 1 : 0,
                'comments_count': comments.length,
                'comments': comments,
              }
            ]
          }),
          200);
    }));
    await tester
        .pumpWidget(MaterialApp(home: CommunityPage(repository: repository)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Chuyến đi Sơn Trà'));
    await tester.pumpAndSettle();
    expect(find.text('Chi tiết bài viết'), findsOneWidget);
    expect(find.text('Cảnh đẹp quá!'), findsOneWidget);

    await tester.tap(find.text('Thả tim (0)'));
    await tester.pumpAndSettle();
    expect(find.text('Đã thích (1)'), findsOneWidget);
    await tester.tap(find.text('Đã thích (1)'));
    await tester.pumpAndSettle();
    expect(find.text('Thả tim (0)'), findsOneWidget);
    expect(
        tester
            .widget<IconButton>(find.widgetWithIcon(IconButton, Icons.send))
            .onPressed,
        isNull);

    await tester.enterText(find.byType(TextField), 'Sơn Trà thật đẹp!');
    await tester.pump();
    await tester.tap(find.byTooltip('Gửi bình luận'));
    await tester.pumpAndSettle();
    expect(find.text('Sơn Trà thật đẹp!'), findsOneWidget);
    expect(find.text('Bình luận (2)'), findsNWidgets(2));
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.textContaining('💬 2'), findsOneWidget);
  });

  testWidgets('failed comment preserves the draft and allows retry',
      (tester) async {
    final repository =
        CommunityRepositoryImpl(client: MockClient((request) async {
      if (request.method == 'POST') return _response('unavailable', 503);
      return _response(
          jsonEncode({
            'data': [
              {
                'id': 1,
                'title': 'Bài viết',
                'content': 'Nội dung',
              }
            ]
          }),
          200);
    }));
    await tester
        .pumpWidget(MaterialApp(home: CommunityPage(repository: repository)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bài viết'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Bình luận có dấu');
    await tester.pump();
    await tester.tap(find.byTooltip('Gửi bình luận'));
    await tester.pumpAndSettle();
    expect(find.text('Không thể gửi bình luận. Vui lòng thử lại.'),
        findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Bình luận có dấu');
    expect(
        tester
            .widget<IconButton>(find.widgetWithIcon(IconButton, Icons.send))
            .onPressed,
        isNotNull);
  });
}
