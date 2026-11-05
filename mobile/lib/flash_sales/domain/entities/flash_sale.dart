class FlashSaleSession {
  const FlashSaleSession(
      {required this.countdown, required this.isLive, required this.items});

  factory FlashSaleSession.fromJson(Map<String, dynamic> json) {
    return FlashSaleSession(
      countdown: _int(json['time_remaining_seconds']),
      isLive: json['is_live'] == true,
      items: (json['items'] as List? ?? const [])
          .whereType<Map>()
          .map(
              (item) => FlashSaleItem.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }

  final int countdown;
  final bool isLive;
  final List<FlashSaleItem> items;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}

class FlashSaleItem {
  const FlashSaleItem({
    required this.id,
    required this.tourId,
    required this.title,
    required this.imageUrl,
    required this.originalPrice,
    required this.promoPrice,
    required this.discount,
    required this.remainingSlots,
  });

  factory FlashSaleItem.fromJson(Map<String, dynamic> json) => FlashSaleItem(
        id: _int(json['id']),
        tourId: _int(json['tour_id']),
        title: '${json['tour_title'] ?? 'Tour trekking'}',
        imageUrl: '${json['tour_cover_image'] ?? ''}',
        originalPrice: _int(json['original_price']),
        promoPrice: _int(json['promo_price']),
        discount: _int(json['discount_percent']),
        remainingSlots: _int(json['remaining_slots']),
      );

  final int id;
  final int tourId;
  final String title;
  final String imageUrl;
  final int originalPrice;
  final int promoPrice;
  final int discount;
  final int remainingSlots;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}
