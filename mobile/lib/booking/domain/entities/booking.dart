enum BookingPayment { payos, vnpay }

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
    this.campaignItemId,
    this.payment = BookingPayment.payos,
  });

  final int tourId;
  final String scheduleId;
  final int adults;
  final int children;
  final String name;
  final String phone;
  final String email;
  final String pickupLocation;
  final int? campaignItemId;
  final BookingPayment payment;
}

class BookingResult {
  const BookingResult({
    required this.orderId,
    required this.bookingCode,
    required this.total,
    required this.paymentOrderCode,
    required this.qrCode,
    this.scheduleId = 0,
  });

  factory BookingResult.fromJson(Map<String, dynamic> json,
          {int scheduleId = 0}) =>
      BookingResult(
        orderId: _int(json['order_id']),
        bookingCode: '${json['order_code'] ?? ''}',
        total: _int(
            json['grand_total'] ?? json['total_price'] ?? json['total_amount']),
        paymentOrderCode: _int(json['payos_order_code']),
        scheduleId: _int(json['schedule_id']) > 0
            ? _int(json['schedule_id'])
            : scheduleId,
        qrCode:
            '${(json['payos'] is Map ? json['payos']['qrCode'] : null) ?? json['qrCode'] ?? json['qr_code'] ?? ''}',
      );

  final int orderId;
  final String bookingCode;
  final int total;
  final int paymentOrderCode;
  final String qrCode;
  final int scheduleId;

  static int _int(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
}
