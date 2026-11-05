class Tour {
  const Tour({
    required this.id,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.difficulty,
    required this.difficultyLabel,
    required this.distanceKm,
    required this.durationHours,
    required this.price,
    required this.priceFormatted,
    required this.checkpoints,
    this.schedules = const [],
  });

  factory Tour.fromJson(Map<String, dynamic> json) {
    final route = _map(json['route']);
    final images = (json['images'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .map((image) => image.trim())
        .where((image) => image.isNotEmpty)
        .toList();
    return Tour(
      id: _int(json['id']),
      title: _string(json['title'], 'Cung đường Sơn Trà'),
      description: _string(json['description']),
      imageUrl:
          _string(json['cover_image_url'], images.isEmpty ? '' : images.first),
      difficulty: _string(json['difficulty_level'], 'moderate'),
      difficultyLabel: _string(
        json['difficulty_label'],
        _difficultyLabel(_string(json['difficulty_level'], 'moderate')),
      ),
      distanceKm: _double(
        route['total_distance_km'] ?? json['total_distance_km'],
      ),
      durationHours: _double(json['duration_hours']),
      price: _int(json['price']),
      priceFormatted: _string(json['price_formatted']),
      checkpoints: (json['checkpoints'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(TourCheckpoint.fromJson)
          .toList(),
      schedules: (json['schedules'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(TourSchedule.fromJson)
          .toList(),
    );
  }

  final int id;
  final String title;
  final String description;
  final String imageUrl;
  final String difficulty;
  final String difficultyLabel;
  final double distanceKm;
  final double durationHours;
  final int price;
  final String priceFormatted;
  final List<TourCheckpoint> checkpoints;
  final List<TourSchedule> schedules;

  static Map<String, dynamic> _map(dynamic value) =>
      value is Map<String, dynamic> ? value : const {};

  static String _string(dynamic value, [String fallback = '']) =>
      value is String && value.trim().isNotEmpty ? value.trim() : fallback;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;

  static double _double(dynamic value) =>
      value is num ? value.toDouble() : double.tryParse('$value') ?? 0;

  static String _difficultyLabel(String value) {
    const labels = {
      'easy': 'Dễ',
      'moderate': 'Trung bình',
      'challenging': 'Thử thách',
      'expert': 'Chuyên gia',
    };
    return labels[value] ?? 'Trung bình';
  }
}

class TourSchedule {
  const TourSchedule({
    required this.id,
    required this.date,
    required this.formattedDate,
    required this.startTime,
    required this.endTime,
    required this.remainingSlots,
    required this.price,
    required this.status,
  });

  factory TourSchedule.fromJson(Map<String, dynamic> json) => TourSchedule(
        id: Tour._string(json['id']),
        date: Tour._string(json['departure_date']),
        formattedDate: Tour._string(json['formatted_date']),
        startTime: Tour._string(json['start_time'], '06:00'),
        endTime: Tour._string(json['end_time'], '10:30'),
        remainingSlots: Tour._int(json['remaining_slots']),
        price: Tour._int(json['price']),
        status: Tour._string(json['status'], 'open'),
      );

  final String id;
  final String date;
  final String formattedDate;
  final String startTime;
  final String endTime;
  final int remainingSlots;
  final int price;
  final String status;
}

class TourCheckpoint {
  const TourCheckpoint({
    required this.name,
    required this.description,
    required this.order,
    required this.latitude,
    required this.longitude,
  });

  factory TourCheckpoint.fromJson(Map<String, dynamic> json) {
    return TourCheckpoint(
      name: Tour._string(json['name'], 'Checkpoint'),
      description: Tour._string(json['description'] ?? json['desc']),
      order: Tour._int(json['order_index']),
      latitude: Tour._double(json['latitude'] ?? json['lat']),
      longitude: Tour._double(json['longitude'] ?? json['lng']),
    );
  }

  final String name;
  final String description;
  final int order;
  final double latitude;
  final double longitude;
}
