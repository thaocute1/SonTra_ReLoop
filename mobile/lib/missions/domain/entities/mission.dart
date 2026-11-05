class Mission {
  const Mission({
    required this.id,
    required this.title,
    required this.description,
    required this.points,
    required this.tag,
    required this.status,
    required this.progress,
    required this.proofUrl,
    this.completedDate,
  });

  factory Mission.fromJson(Map<String, dynamic> json) => Mission(
        id: _int(json['id']),
        title: _string(json['title'], 'Nhiệm vụ xanh'),
        description: _string(json['desc']),
        points: _int(json['points']),
        tag: _string(json['tag'], 'Nhiệm vụ Xanh'),
        status: _string(json['status'], 'in_progress'),
        progress: _int(json['progress']),
        proofUrl: _string(json['proofUrl']),
        completedDate: json['completedDate'] as String?,
      );

  final int id;
  final String title;
  final String description;
  final int points;
  final String tag;
  final String status;
  final int progress;
  final String proofUrl;
  final String? completedDate;

  bool get isCompleted => status == 'completed';

  static String _string(dynamic value, [String fallback = '']) =>
      value is String && value.trim().isNotEmpty ? value.trim() : fallback;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}
