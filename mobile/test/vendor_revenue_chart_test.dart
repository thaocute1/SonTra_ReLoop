import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:son_tra_trail_quest/vendor/pages/vendor_revenue_chart.dart';

void main() {
  testWidgets('chart selects an exact revenue amount on a narrow screen', (tester) async {
    tester.view.physicalSize = const Size(360, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: VendorRevenueChart(points: [
      for (var i = 1; i <= 30; i++) {'date':'day-$i','label':'$i/11','revenue':i * 100000},
    ]))));
    await tester.tap(find.byKey(const ValueKey('revenue-bar-day-1')));
    await tester.pumpAndSettle();
    expect(find.text('1/11: 100.000 đ'), findsOneWidget);
    await tester.drag(find.byType(SingleChildScrollView), const Offset(-1600, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('revenue-bar-day-30')));
    await tester.pumpAndSettle();
    expect(find.text('30/11: 3.000.000 đ'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('chart handles a period with no revenue', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: VendorRevenueChart(
      points: [{'date':'2026-11-28','label':'28/11','revenue':0}],
    ))));
    expect(find.text('Chưa ghi nhận doanh thu trong kỳ này.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
