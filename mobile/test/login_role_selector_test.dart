import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:son_tra_trail_quest/auth/pages/login.dart';

void main() {
  testWidgets('Role selector appears below welcome and above email field',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginPage()));

    final selector = find.byType(CupertinoSlidingSegmentedControl<bool>);
    expect(selector, findsOneWidget);
    expect(
      tester.getTopLeft(selector).dy,
      greaterThan(tester.getBottomLeft(find.text(
        'Đăng nhập để tiếp tục hành trình khám phá Sơn Trà.',
      )).dy),
    );
    expect(
      tester.getBottomLeft(selector).dy,
      lessThan(tester.getTopLeft(find.text('Email hoặc số điện thoại')).dy),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Role selector supports tapping and dragging back to User',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginPage()));
    final selector = find.byType(CupertinoSlidingSegmentedControl<bool>);
    bool? selectedRole() => tester
        .widget<CupertinoSlidingSegmentedControl<bool>>(selector)
        .groupValue;

    expect(selectedRole(), isFalse);
    await tester.tap(find.text('Staff'));
    await tester.pumpAndSettle();
    expect(selectedRole(), isTrue);

    await tester.dragFrom(
      tester.getCenter(find.text('Staff')),
      tester.getCenter(find.text('User')) -
          tester.getCenter(find.text('Staff')),
    );
    await tester.pumpAndSettle();
    expect(selectedRole(), isFalse);
    expect(tester.takeException(), isNull);
  });
}
