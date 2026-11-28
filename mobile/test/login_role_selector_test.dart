import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/auth/domain/entities/login_credentials.dart';
import 'package:son_tra_trail_quest/auth/domain/repositories/auth_repository.dart';
import 'package:son_tra_trail_quest/auth/domain/usecases/login_use_case.dart';
import 'package:son_tra_trail_quest/auth/pages/login.dart';

class StaffLoginRepository implements AuthRepository {
  @override
  Future<String?> login(LoginCredentials credentials) async {
    return AuthSession.start({
      'access': 'test-token',
      'user': {'id': 1, 'role': 'staff', 'name': 'Test Staff'},
    });
  }
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets('Role selector appears below welcome and above email field',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginPage()));

    final selector = find.byType(CupertinoSlidingSegmentedControl<bool>);
    expect(selector, findsOneWidget);
    expect(
      tester.getTopLeft(selector).dy,
      greaterThan(tester
          .getBottomLeft(find.text(
            'Đăng nhập để tiếp tục hành trình khám phá Sơn Trà.',
          ))
          .dy),
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
    await tester.tap(find.text('Guide'));
    await tester.pumpAndSettle();
    expect(selectedRole(), isTrue);

    await tester.dragFrom(
      tester.getCenter(find.text('Guide')),
      tester.getCenter(find.text('User')) -
          tester.getCenter(find.text('Guide')),
    );
    await tester.pumpAndSettle();
    expect(selectedRole(), isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('staff login stays on the mobile login page and clears session',
      (tester) async {
    addTearDown(AuthSession.clear);
    await tester.pumpWidget(MaterialApp(
      home: LoginPage(loginUseCase: LoginUseCase(StaffLoginRepository())),
    ));
    await tester.pumpAndSettle();
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'staff@example.com');
    await tester.enterText(fields.at(1), 'test-password');
    final login = find.text('Đăng nhập');
    await tester.ensureVisible(login);
    await tester.tap(login);
    await tester.pumpAndSettle();

    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.text('Ứng dụng mobile chỉ hỗ trợ tài khoản User và Guide.'),
        findsOneWidget);
    expect(AuthSession.accessToken, isNull);
  });
}
