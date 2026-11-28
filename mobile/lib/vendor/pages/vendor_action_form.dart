import 'package:flutter/material.dart';
import '../domain/vendor_repository.dart';

/// A compact mobile form shared by vendor actions, with typed values and bounds.
class VendorActionForm extends StatefulWidget {
  const VendorActionForm(
      {super.key,
      required this.title,
      required this.fields,
      this.initial = const {},
      this.choices = const {},
      this.bounds = const {}});
  final String title;
  final Map<String, String> fields;
  final VendorRecord initial;
  final Map<String, Map<String, String>> choices;
  final Map<String, (num, num)> bounds;
  @override
  State<VendorActionForm> createState() => _VendorActionFormState();
}

class _VendorActionFormState extends State<VendorActionForm> {
  final _key = GlobalKey<FormState>();
  late final _controllers = {
    for (final key in widget.fields.keys)
      key: TextEditingController(text: '${widget.initial[key] ?? ''}')
  };
  late final _selected = {
    for (final e in widget.choices.entries)
      e.key: '${widget.initial[e.key] ?? e.value.keys.first}'
  };
  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
          title: Text(widget.title),
          content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                  child: Form(
                      key: _key,
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        for (final field in widget.fields.entries)
                          Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: widget.choices.containsKey(field.key)
                                  ? DropdownButtonFormField<String>(
                                      initialValue: _selected[field.key],
                                      isExpanded: true,
                                      decoration: InputDecoration(
                                          labelText: field.value),
                                      items: widget.choices[field.key]!.entries
                                          .map((e) => DropdownMenuItem(
                                              value: e.key,
                                              child: Text(e.value)))
                                          .toList(),
                                      onChanged: (v) =>
                                          _selected[field.key] = v!)
                                  : TextFormField(
                                      key: ValueKey(field.key),
                                      controller: _controllers[field.key],
                                      hintLocales: const [
                                        Locale('vi', 'VN'),
                                        Locale('en', 'US')
                                      ],
                                      keyboardType:
                                          widget.bounds.containsKey(field.key)
                                              ? const TextInputType
                                                  .numberWithOptions(
                                                  decimal: true, signed: true)
                                              : field.key.contains('phone')
                                                  ? TextInputType.phone
                                                  : field.key == 'description'
                                                      ? TextInputType.multiline
                                                      : TextInputType.text,
                                      minLines:
                                          field.key == 'description' ? 3 : 1,
                                      maxLines:
                                          field.key == 'description' ? 5 : 1,
                                      decoration: InputDecoration(
                                          labelText: field.value),
                                      onTap: field.key.endsWith('_date')
                                          ? () async {
                                              final date = await showDatePicker(
                                                  context: context,
                                                  firstDate: DateTime.now(),
                                                  lastDate: DateTime.now().add(
                                                      const Duration(
                                                          days: 730)));
                                              if (date != null) {
                                                _controllers[field.key]!.text =
                                                    date
                                                        .toIso8601String()
                                                        .substring(0, 10);
                                              }
                                            }
                                          : null,
                                      validator: (v) {
                                        if (v == null || v.trim().isEmpty) {
                                          return 'Vui lòng nhập thông tin';
                                        }
                                        final bound = widget.bounds[field.key];
                                        if (bound != null) {
                                          final n = num.tryParse(v);
                                          if (n == null ||
                                              n < bound.$1 ||
                                              n > bound.$2) {
                                            return 'Giá trị từ ${bound.$1} đến ${bound.$2}';
                                          }
                                        }
                                        if (field.key.endsWith('_date') &&
                                            DateTime.tryParse(v) == null) {
                                          return 'Ngày theo dạng YYYY-MM-DD';
                                        }
                                        return null;
                                      })),
                      ])))),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Hủy')),
            FilledButton(
                onPressed: () {
                  if (!_key.currentState!.validate()) return;
                  Navigator.pop(context, <String, dynamic>{
                    ...widget.initial,
                    for (final e in _controllers.entries)
                      e.key: widget.bounds.containsKey(e.key)
                          ? num.parse(e.value.text)
                          : e.value.text.trim(),
                    ..._selected
                  });
                },
                child: const Text('Lưu'))
          ]);
}
