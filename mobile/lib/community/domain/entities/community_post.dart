class CommunityPost {
  const CommunityPost({
    required this.id,
    required this.authorName,
    required this.authorInitials,
    required this.title,
    required this.content,
    required this.location,
    required this.imageUrl,
    required this.likes,
    required this.comments,
    required this.pointsReward,
  });

  factory CommunityPost.fromJson(Map<String, dynamic> json) => CommunityPost(
        id: _int(json['id']),
        authorName: _string(json['author_name'], 'Eco-Hero'),
        authorInitials: _string(json['author_initials'], 'EH'),
        title: _string(json['title']),
        content: _string(json['content']),
        location: _string(json['location_tag'], 'Bán đảo Sơn Trà'),
        imageUrl: _string(json['thumbnail_url']),
        likes: _int(json['likes_count']),
        comments: _int(json['comments_count']),
        pointsReward: _string(json['points_reward']),
      );

  final int id;
  final String authorName;
  final String authorInitials;
  final String title;
  final String content;
  final String location;
  final String imageUrl;
  final int likes;
  final int comments;
  final String pointsReward;

  static String _string(dynamic value, [String fallback = '']) =>
      value is String && value.trim().isNotEmpty ? value.trim() : fallback;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}
