import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/auth/data/services/remembered_login_service.dart';
import 'package:son_tra_trail_quest/auth/domain/entities/login_credentials.dart';
import 'package:son_tra_trail_quest/auth/domain/repositories/auth_repository.dart';
import 'package:son_tra_trail_quest/auth/domain/usecases/login_use_case.dart';
import 'package:son_tra_trail_quest/auth/pages/login.dart';

class _LoginRepository implements AuthRepository {
  _LoginRepository({this.fail = false});
  final bool fail;
  @override
  Future<String?> login(LoginCredentials credentials) async {
    if (fail) throw Exception('Sai thông tin đăng nhập');
    return AuthSession.start({
      'access': 'test-token',
      'user': {
        'id': 1,
        'name': 'Guide',
        'role': 'guide',
        'email': credentials.email,
      }
    });
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const service = RememberedLoginService();
  const credentials =
      LoginCredentials(email: 'guide@example.com', password: 'test-password');
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    SharedPreferences.setMockInitialValues({});
  });
  tearDown(AuthSession.clear);

  test(
      'secure records persist separately for vendor and user, and can be removed',
      () async {
    await service.save(credentials, vendor: false);
    expect((await service.read(vendor: false))?.password, credentials.password);
    expect(await service.read(vendor: true), isNull);
    await service.save(
        const LoginCredentials(
            email: 'vendor@example.com', password: 'vendor-password'),
        vendor: true);
    await service.clear(vendor: false);
    expect(await service.read(vendor: false), isNull);
    expect((await service.read(vendor: true))?.email, 'vendor@example.com');
  });

  testWidgets(
      'restores credentials after reopening and unchecking erases saved data',
      (tester) async {
    await service.save(credentials, vendor: false);
    await tester.pumpWidget(const MaterialApp(home: LoginPage()));
    await tester.pumpAndSettle();
    final fields =
        tester.widgetList<TextFormField>(find.byType(TextFormField)).toList();
    expect(fields[0].controller!.text, credentials.email);
    expect(fields[1].controller!.text, credentials.password);
    expect(
        tester
            .widgetList<EditableText>(find.byType(EditableText))
            .elementAt(1)
            .obscureText,
        isTrue);
    expect(tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isTrue);
    await tester.ensureVisible(find.text('Ghi nhớ mật khẩu'));
    await tester.tap(find.text('Ghi nhớ mật khẩu'));
    await tester.pumpAndSettle();
    expect(await service.read(vendor: false), isNull);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(const MaterialApp(home: LoginPage()));
    await tester.pumpAndSettle();
    expect(
        tester
            .widgetList<TextFormField>(find.byType(TextFormField))
            .first
            .controller!
            .text,
        isEmpty);
  });

  for (final fail in [false, true]) {
    testWidgets(
        fail
            ? 'failed login does not save password'
            : 'successful login saves opted-in credentials', (tester) async {
      await tester.pumpWidget(MaterialApp(
          home: LoginPage(
              loginUseCase: LoginUseCase(_LoginRepository(fail: fail)))));
      await tester.pumpAndSettle();
      await tester.enterText(
          find.byType(TextFormField).first, credentials.email);
      await tester.enterText(
          find.byType(TextFormField).at(1), credentials.password);
      await tester.ensureVisible(find.text('Ghi nhớ mật khẩu'));
      await tester.tap(find.text('Ghi nhớ mật khẩu'));
      await tester.pump();
      await tester.ensureVisible(find.text('Đăng nhập'));
      await tester.tap(find.text('Đăng nhập'));
      await tester.pumpAndSettle();
      final saved = await service.read(vendor: false);
      if (fail) {
        expect(saved, isNull);
        expect(find.text('Sai thông tin đăng nhập'), findsOneWidget);
      } else {
        expect(saved?.email, credentials.email);
        expect(saved?.password, credentials.password);
      }
      await tester.pumpWidget(const SizedBox());
    });
  }
}
