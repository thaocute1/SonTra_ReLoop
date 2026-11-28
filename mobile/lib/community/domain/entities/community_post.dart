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
    this.isPending = false,
    this.isLiked = false,
    this.commentItems = const [],
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
        isPending: json['is_pending'] == true,
        isLiked: json['is_liked'] == true,
        commentItems: (json['comments'] is List ? json['comments'] as List : [])
            .whereType<Map<String, dynamic>>()
            .map(CommunityComment.fromJson)
            .toList(),
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
  final bool isPending;
  final bool isLiked;
  final List<CommunityComment> commentItems;

  CommunityPost withInteractions({
    bool? isLiked,
    int? likes,
    List<CommunityComment>? commentItems,
  }) =>
      CommunityPost(
        id: id,
        authorName: authorName,
        authorInitials: authorInitials,
        title: title,
        content: content,
        location: location,
        imageUrl: imageUrl,
        likes: likes ?? this.likes,
        comments: commentItems?.length ?? comments,
        pointsReward: pointsReward,
        isPending: isPending,
        isLiked: isLiked ?? this.isLiked,
        commentItems: commentItems ?? this.commentItems,
      );

  static String _string(dynamic value, [String fallback = '']) =>
      value is String && value.trim().isNotEmpty ? value.trim() : fallback;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}

class CommunityComment {
  const CommunityComment(
      {required this.id,
      required this.authorName,
      required this.content,
      required this.createdAt});

  factory CommunityComment.fromJson(Map<String, dynamic> json) =>
      CommunityComment(
        id: '${json['id'] ?? ''}',
        authorName: CommunityPost._string(json['author_name'], 'Du khách'),
        content: CommunityPost._string(json['content']),
        createdAt: CommunityPost._string(json['created_at']),
      );

  final String id;
  final String authorName;
  final String content;
  final String createdAt;
}
