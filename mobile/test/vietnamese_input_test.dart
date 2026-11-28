import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:son_tra_trail_quest/auth/pages/register.dart';
import 'package:son_tra_trail_quest/vendor/domain/vendor_repository.dart';
import 'package:son_tra_trail_quest/vendor/pages/vendor_action_form.dart';
import 'package:son_tra_trail_quest/vendor/pages/vendor_onboarding_page.dart';

void main() {
  testWidgets('registration preserves Vietnamese IME composition and accents',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: RegisterPage()));
    final name = find.byType(TextFormField).first;
    await tester.ensureVisible(name);
    await tester.tap(name);
    await tester.pumpAndSettle();
    for (final text in ['Nguy', 'Nguyễn', 'Nguyễn Thị Ánh']) {
      final value = TextEditingValue(
        text: text,
        selection: TextSelection.collapsed(offset: text.length),
        composing: TextRange(start: 0, end: text.length),
      );
      tester.testTextInput.updateEditingValue(value);
      await tester.pump();
      final editable = tester.widget<EditableText>(
          find.descendant(of: name, matching: find.byType(EditableText)));
      expect(editable.controller.value, value);
    }
    tester.view.viewInsets = const FakeViewPadding(bottom: 200);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    final editable = tester.widget<EditableText>(
        find.descendant(of: name, matching: find.byType(EditableText)));
    expect(editable.controller.text, 'Nguyễn Thị Ánh');
    expect(editable.controller.value.composing.isValid, isTrue);
    tester.testTextInput.updateEditingValue(
        editable.controller.value.copyWith(composing: TextRange.empty));
    await tester.pump();
    expect(editable.controller.text, 'Nguyễn Thị Ánh');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'Vietnamese composition survives keyboard resize and submits accents',
      (tester) async {
    VendorRecord? saved;
    await tester.pumpWidget(MaterialApp(
        home: Builder(
            builder: (context) => Scaffold(
                body: TextButton(
                    onPressed: () async {
                      saved = await showDialog<VendorRecord>(
                          context: context,
                          builder: (_) => const VendorActionForm(
                                  title: 'Trải nghiệm',
                                  fields: {
                                    'title': 'Tên trải nghiệm',
                                    'description': 'Mô tả'
                                  }));
                    },
                    child: const Text('Mở'))))));
    await tester.tap(find.text('Mở'));
    await tester.pumpAndSettle();
    final title = find.byKey(const ValueKey('title'));
    await tester.tap(title);
    await tester.pumpAndSettle();
    for (final value in [
      'Ngu',
      'Nguyê',
      'Nguyễn',
      'Nguyễn Văn',
      'Nguyễn Văn Đạt'
    ]) {
      tester.testTextInput.updateEditingValue(TextEditingValue(
          text: value,
          selection: TextSelection.collapsed(offset: value.length),
          composing: TextRange(start: 0, end: value.length)));
      await tester.pump();
      final editable = tester.widget<EditableText>(
          find.descendant(of: title, matching: find.byType(EditableText)));
      expect(editable.controller.text, value);
      expect(editable.controller.value.composing,
          TextRange(start: 0, end: value.length));
    }
    tester.view.viewInsets = const FakeViewPadding(bottom: 200);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    final editable = tester.widget<EditableText>(
        find.descendant(of: title, matching: find.byType(EditableText)));
    expect(editable.controller.text, 'Nguyễn Văn Đạt');
    expect(editable.controller.value.composing,
        const TextRange(start: 0, end: 14));
    final description = find.byKey(const ValueKey('description'));
    await tester.ensureVisible(description);
    await tester.enterText(
        description, 'Khám phá Sơn Trà\nBảo tồn thiên nhiên');
    await tester.ensureVisible(find.text('Lưu'));
    await tester.tap(find.text('Lưu'));
    await tester.pumpAndSettle();
    expect(saved?['title'], 'Nguyễn Văn Đạt');
    expect(saved?['description'], 'Khám phá Sơn Trà\nBảo tồn thiên nhiên');
  });
  testWidgets(
      'onboarding uses Vietnamese hints and accepts composing business name',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: VendorOnboardingPage()));
    final field = find.byKey(const ValueKey('brand_name'));
    await tester.ensureVisible(field);
    await tester.tap(field);
    await tester.pumpAndSettle();
    const value = 'Công ty Du lịch Sơn Trà';
    tester.testTextInput.updateEditingValue(const TextEditingValue(
        text: value,
        selection: TextSelection.collapsed(offset: value.length),
        composing: TextRange(start: 0, end: value.length)));
    await tester.pump();
    final editable = tester.widget<EditableText>(
        find.descendant(of: field, matching: find.byType(EditableText)));
    expect(editable.controller.text, value);
    expect(editable.hintLocales, contains(const Locale('vi', 'VN')));
    expect(tester.takeException(), isNull);
  });
}
