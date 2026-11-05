class BookingRequest {
  const BookingRequest({
    required this.tourId,
    required this.scheduleId,
    required this.adults,
    required this.children,
    required this.name,
    required this.phone,
    required this.email,
    required this.pickupLocation,
  });

  final int tourId;
  final String scheduleId;
  final int adults;
  final int children;
  final String name;
  final String phone;
  final String email;
  final String pickupLocation;
}

class BookingResult {
  const BookingResult({
    required this.orderId,
    required this.bookingCode,
    required this.total,
    required this.paymentOrderCode,
    required this.qrCode,
  });

  factory BookingResult.fromJson(Map<String, dynamic> json) => BookingResult(
        orderId: _int(json['order_id']),
        bookingCode: '${json['order_code'] ?? ''}',
        total: _int(
            json['grand_total'] ?? json['total_price'] ?? json['total_amount']),
        paymentOrderCode: _int(json['payos_order_code']),
        qrCode:
            '${(json['payos'] is Map ? json['payos']['qrCode'] : null) ?? json['qrCode'] ?? json['qr_code'] ?? ''}',
      );

  final int orderId;
  final String bookingCode;
  final int total;
  final int paymentOrderCode;
  final String qrCode;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}
