import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:son_tra_trail_quest/auth/data/repositories/auth_repository_impl.dart';
import 'package:son_tra_trail_quest/auth/data/repositories/register_repository_impl.dart';
import 'package:son_tra_trail_quest/auth/data/services/auth_session.dart';
import 'package:son_tra_trail_quest/auth/domain/entities/login_credentials.dart';
import 'package:son_tra_trail_quest/auth/domain/entities/register_credentials.dart';
import 'package:son_tra_trail_quest/auth/domain/repositories/register_repository.dart';
import 'package:son_tra_trail_quest/auth/domain/usecases/register_use_case.dart';
import 'package:son_tra_trail_quest/auth/pages/login.dart';
import 'package:son_tra_trail_quest/auth/pages/register.dart';
import 'package:son_tra_trail_quest/booking/pages/booking_page.dart';
import 'package:son_tra_trail_quest/tours/domain/entities/tour.dart';

class _Registration implements RegisterRepository {
  RegisterCredentials? saved;
  @override
  Future<void> register(RegisterCredentials credentials) async {
    saved = credentials;
  }
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  tearDown(AuthSession.clear);

  testWidgets(
      'registration phone is returned at login and prefilled for booking',
      (tester) async {
    String? savedPhone;
    final methods = <String>[];
    final client = MockClient((request) async {
      methods.add(request.method);
      final body = jsonDecode(request.body);
      if (request.url.path.endsWith('/register/')) {
        savedPhone = body['phone'];
        expect(savedPhone, '0901234567');
        return http.Response('{}', 201);
      }
      expect(request.url.path, endsWith('/login/'));
      expect(body.containsKey('phone'), isFalse);
      return http.Response(
          jsonEncode({
            'access': 'token',
            'user': {
              'id': 1,
              'role': 'customer',
              'name': 'User',
              'email': 'user@example.com',
              'phone': savedPhone,
            }
          }),
          200);
    });
    await RegisterRepositoryImpl(client: client)
        .register(const RegisterCredentials(
      fullName: 'User',
      email: 'user@example.com',
      password: 'password',
      phone: '090 123 4567',
    ));
    await AuthRepositoryImpl(client: client).login(const LoginCredentials(
        email: 'user@example.com', password: 'password'));
    expect(methods, ['POST', 'POST']);
    await tester.pumpWidget(MaterialApp(
        home: BookingPage(tour: Tour.fromJson({'id': 1, 'title': 'Son Tra'}))));
    await tester.pumpAndSettle();
    expect(
        tester
            .widgetList<TextFormField>(find.byType(TextFormField))
            .any((field) => field.controller?.text == savedPhone),
        isTrue);
  });

  testWidgets(
      'registration collects phone; login contains only email and password',
      (tester) async {
    final repository = _Registration();
    await tester.pumpWidget(MaterialApp(
        home: RegisterPage(registerUseCase: RegisterUseCase(repository))));
    final fields = find.byType(TextFormField);
    for (final (index, value) in [
      'Nguyễn Ánh',
      'user@example.com',
      '0901234567',
      'password',
      'password'
    ].indexed) {
      await tester.ensureVisible(fields.at(index));
      await tester.enterText(fields.at(index), value);
    }
    await tester.ensureVisible(find.text('Tạo tài khoản'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tạo tài khoản'));
    await tester.pumpAndSettle();
    expect(repository.saved?.phone, '0901234567');
    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Số điện thoại liên hệ'), findsNothing);
    expect(find.text('Ghi nhớ mật khẩu'), findsOneWidget);
  });

  testWidgets('registration rejects invalid phone before submitting',
      (tester) async {
    final repository = _Registration();
    await tester.pumpWidget(MaterialApp(
        home: RegisterPage(registerUseCase: RegisterUseCase(repository))));
    final fields = find.byType(TextFormField);
    for (final (index, value) in [
      'User',
      'user@example.com',
      'abc',
      'password',
      'password'
    ].indexed) {
      await tester.ensureVisible(fields.at(index));
      await tester.enterText(fields.at(index), value);
    }
    await tester.ensureVisible(find.text('Tạo tài khoản'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tạo tài khoản'));
    await tester.pumpAndSettle();
    expect(find.text('Số điện thoại cần từ 9 đến 15 chữ số'), findsOneWidget);
    expect(repository.saved, isNull);
  });
}
