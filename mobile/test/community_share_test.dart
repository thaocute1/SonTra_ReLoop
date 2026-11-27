import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/community/data/community_repository.dart';
import 'package:son_tra_trail_quest/community/pages/community_page.dart';
import 'package:son_tra_trail_quest/dashboard/pages/dashboard.dart';
import 'package:son_tra_trail_quest/dashboard/widgets/bottom_navigation.dart';

void main() {
  test('community posts send the actual image as multipart data', () async {
    final repository =
        CommunityRepositoryImpl(client: MockClient((request) async {
      expect(request.url.path, endsWith('/community/posts/create/'));
      expect(
          request.headers['content-type'], startsWith('multipart/form-data;'));
      expect(request.body, contains('name="image"'));
      expect(request.bodyBytes, containsAllInOrder([1, 2, 3, 4]));
      return http.Response('{"data":{"id":1,"is_pending":true}}', 201);
    }));
    final post = await repository.createPost(
        title: '', content: '', image: Uint8List.fromList([1, 2, 3, 4]));
    expect(post.isPending, isTrue);
  });

  testWidgets('submitting a story returns to the community feed',
      (tester) async {
    final repository =
        CommunityRepositoryImpl(client: MockClient((request) async {
      if (request.method == 'POST') {
        expect(request.body, contains('My trekking story'));
        return http.Response('{"data":{"id":1,"is_pending":true}}', 201);
      }
      return http.Response('{"data":[]}', 200);
    }));
    await tester
        .pumpWidget(MaterialApp(home: CommunityPage(repository: repository)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Viết bài chia sẻ'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, 'My trekking story');
    final submit = find.text('Gửi bài chia sẻ');
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(find.text('Chia sẻ cộng đồng'), findsOneWidget);
    expect(find.text('Đã gửi bài. Bài viết đang chờ duyệt.'), findsOneWidget);
  });

  testWidgets('back from Explore returns home without popping the dashboard',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
        home: Builder(
            builder: (context) => Scaffold(
                  body: TextButton(
                      onPressed: () =>
                          Navigator.of(context).push(MaterialPageRoute<void>(
                            builder: (_) => const DashboardPage(),
                          )),
                      child: const Text('Open dashboard')),
                ))));
    await tester.tap(find.text('Open dashboard'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Khám phá'));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Chia sẻ cộng đồng'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<DashboardBottomNavigation>(
                find.byType(DashboardBottomNavigation))
            .selectedIndex,
        1);

    await tester.tap(find.byTooltip('Quay lại'));
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<DashboardBottomNavigation>(
                find.byType(DashboardBottomNavigation))
            .selectedIndex,
        0);

    await tester.tap(find.text('Khám phá'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<DashboardBottomNavigation>(
                find.byType(DashboardBottomNavigation))
            .selectedIndex,
        0);
    await tester.pumpWidget(const SizedBox());
    expect(tester.takeException(), isNull);
  });
}
