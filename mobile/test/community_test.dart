import 'package:flutter_test/flutter_test.dart';

import 'package:son_tra_trail_quest/community/domain/entities/community_post.dart';

void main() {
  test('parses community post fields', () {
    final post = CommunityPost.fromJson({
      'id': 1,
      'author_name': 'Thảo Trần',
      'author_initials': 'TH',
      'content': 'Đã check-in cung đường.',
      'location_tag': 'Đỉnh Bàn Cờ',
      'likes_count': 24,
      'comments_count': 2,
    });

    expect(post.authorName, 'Thảo Trần');
    expect(post.location, 'Đỉnh Bàn Cờ');
    expect(post.likes, 24);
  });
}
