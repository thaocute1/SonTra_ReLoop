import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:son_tra_trail_quest/booking/data/booking_repository.dart';
import 'package:son_tra_trail_quest/booking/domain/entities/booking.dart';
import 'package:son_tra_trail_quest/booking/pages/booking_page.dart';
import 'package:son_tra_trail_quest/booking/pages/payment_page.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';

Tour tour(List<Map<String, dynamic>> schedules) => Tour.fromJson({
      'id': 1,
      'title': 'Test tour',
      'price': 450000,
      'schedules': schedules,
    });

Map<String, dynamic> schedule(String id) => {
      'id': id,
      'formatted_date': '20/11/2026',
      'remaining_slots': 5,
      'price': 450000,
      'status': 'open',
    };

class FakePayments extends BookingRepository {
  int creates = 0;
  int? checkedCode;
  String status = 'PENDING';
  bool fail = false;

  @override
  Future<Map<String, dynamic>> createPaymentLink(int orderId) async {
    creates++;
    if (fail) throw Exception('Connection failed');
    return {'qrCode': 'new-qr', 'orderCode': 222};
  }

  @override
  Future<String> checkPayment(int orderCode) async {
    checkedCode = orderCode;
    return status;
  }
}

const booking = BookingResult(
    orderId: 1,
    bookingCode: 'TEST',
    total: 450000,
    paymentOrderCode: 111,
    qrCode: 'existing-qr');

void main() {
  testWidgets('no schedules does not invent bookable departures on rebuild',
      (tester) async {
    await tester.pumpWidget(MaterialApp(home: BookingPage(tour: tour([]))));
    await tester.tap(find.byIcon(Icons.add_circle_outline).first);
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(
        tester
            .widget<DropdownButtonFormField<String>>(
                find.byType(DropdownButtonFormField<String>))
            .initialValue,
        isNull);
  });

  testWidgets('duplicate and replaced schedules keep a unique valid selection',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
        home: BookingPage(tour: tour([schedule('1'), schedule('1')]))));
    await tester.tap(find.byIcon(Icons.add_circle_outline).first);
    await tester.pump();
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(
        MaterialApp(home: BookingPage(tour: tour([schedule('2')]))));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(
        tester
            .widget<DropdownButtonFormField<String>>(
                find.byType(DropdownButtonFormField<String>))
            .initialValue,
        '2');
  });

  testWidgets('a departure can be selected after a refund leaves a few seats',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
        home: BookingPage(
            tour: tour([
      {...schedule('closed'), 'status': 'cancelled'},
      {...schedule('released'), 'status': 'almost_full', 'remaining_slots': 3},
    ]))));
    expect(
        tester
            .widget<DropdownButtonFormField<String>>(
                find.byType(DropdownButtonFormField<String>))
            .initialValue,
        'released');
  });

  testWidgets('existing QR is reused and pending payment never shows success',
      (tester) async {
    final repository = FakePayments();
    await tester.pumpWidget(MaterialApp(
        home: PaymentPage(booking: booking, repository: repository)));
    expect(repository.creates, 0);
    expect(find.byType(QrImageView), findsOneWidget);
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(repository.checkedCode, 111);
    expect(find.byType(BookingSuccessPage), findsNothing);
    repository.status = 'PAID';
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(find.byType(BookingSuccessPage), findsOneWidget);
  });

  testWidgets('failed QR request can retry and checks the returned order code',
      (tester) async {
    final repository = FakePayments()..fail = true;
    await tester.pumpWidget(MaterialApp(
        home: PaymentPage(
            booking: const BookingResult(
                orderId: 1,
                bookingCode: 'TEST',
                total: 450000,
                paymentOrderCode: 0,
                qrCode: ''),
            repository: repository)));
    await tester.pumpAndSettle();
    expect(find.byType(QrImageView), findsNothing);
    repository.fail = false;
    await tester.tap(find.byType(OutlinedButton));
    await tester.pumpAndSettle();
    expect(find.byType(QrImageView), findsOneWidget);
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(repository.checkedCode, 222);
    expect(find.byType(BookingSuccessPage), findsNothing);
  });
}
