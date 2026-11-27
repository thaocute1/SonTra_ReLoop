import 'package:flutter/material.dart';
import '../data/health_repository.dart';
import '../domain/health_profile.dart';

class HealthPage extends StatefulWidget {
  const HealthPage({super.key, this.repository = const HealthRepository()});
  final HealthRepository repository;
  @override
  State<HealthPage> createState() => _HealthPageState();
}

class _HealthPageState extends State<HealthPage> {
  final _form = GlobalKey<FormState>();
  final _inputs = {
    for (final key in HealthProfile.fields) key: TextEditingController()
  };
  String? _fitness, _error;
  bool _loading = true, _saving = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final input in _inputs.values) {
      input.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await widget.repository.load();
      if (!mounted) return;
      for (final e in _inputs.entries) {
        e.value.text = '${profile.values[e.key] ?? ''}';
      }
      _fitness = ['fit', 'normal', 'low_fitness']
              .contains(profile.values['fitness_level'])
          ? profile.values['fitness_level'] as String
          : null;
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_saving || !_form.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _saving = true);
    try {
      await widget.repository.save(HealthProfile({
        for (final e in _inputs.entries)
          e.key: ['height_cm', 'weight_kg'].contains(e.key)
              ? num.tryParse(e.value.text.trim().replaceAll(',', '.'))
              : e.value.text.trim().isEmpty
                  ? null
                  : e.value.text.trim(),
        'fitness_level': _fitness,
      }));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã lưu hồ sơ sức khỏe.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Không lưu được: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _heading(String label) => Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Text(label,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold)));
  Widget _field(String key, String label,
          {num? maximum, int lines = 1, TextInputType? keyboard}) =>
      Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
              key: ValueKey(key),
              controller: _inputs[key],
              enabled: !_saving,
              hintLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
              keyboardType: maximum != null
                  ? const TextInputType.numberWithOptions(decimal: true)
                  : keyboard,
              minLines: lines,
              maxLines: lines,
              maxLength: key == 'medical_notes'
                  ? 1000
                  : key == 'emergency_contact_name'
                      ? 255
                      : null,
              decoration: InputDecoration(
                  labelText: label, border: const OutlineInputBorder()),
              validator: (value) {
                if (value == null || value.trim().isEmpty) return null;
                if (maximum != null) {
                  final number =
                      num.tryParse(value.trim().replaceAll(',', '.'));
                  if (number == null ||
                      !number.isFinite ||
                      number <= 0 ||
                      number > maximum) {
                    return 'Nhập giá trị lớn hơn 0 và không quá $maximum';
                  }
                }
                if (key == 'emergency_contact_phone' &&
                    !RegExp(r'^\+?[0-9]{9,15}$').hasMatch(
                        value.trim().replaceAll(RegExp(r'[\s\-\.\(\)]'), ''))) {
                  return 'Số điện thoại không hợp lệ';
                }
                return null;
              }));
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Sức khỏe của tôi')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!),
                        TextButton(
                            onPressed: _load, child: const Text('Thử lại'))
                      ])))
              : SafeArea(
                  child: Form(
                      key: _form,
                      child: SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Card(
                                    child: Padding(
                                        padding: EdgeInsets.all(16),
                                        child: Row(children: [
                                          Icon(Icons.favorite_outline,
                                              color: Color(0xFF4E7567)),
                                          SizedBox(width: 12),
                                          Expanded(
                                              child: Text(
                                                  'Cập nhật thể trạng để cá nhân hóa gợi ý trải nghiệm trekking. Các thông tin đều không bắt buộc.'))
                                        ]))),
                                _heading('Thông tin thể trạng'),
                                Padding(
                                    padding: const EdgeInsets.only(bottom: 16),
                                    child: TextFormField(
                                        key: const ValueKey('date_of_birth'),
                                        controller: _inputs['date_of_birth'],
                                        readOnly: true,
                                        decoration: InputDecoration(
                                            labelText: 'Ngày sinh',
                                            hintText: 'YYYY-MM-DD',
                                            border: const OutlineInputBorder(),
                                            suffixIcon: IconButton(
                                                tooltip: 'Xóa ngày sinh',
                                                onPressed: _saving
                                                    ? null
                                                    : () => _inputs[
                                                            'date_of_birth']!
                                                        .clear(),
                                                icon: const Icon(Icons.clear))),
                                        onTap: _saving
                                            ? null
                                            : () async {
                                                final now = DateTime.now();
                                                final selected = await showDatePicker(
                                                    context: context,
                                                    firstDate: DateTime(1900),
                                                    lastDate: now,
                                                    initialDate: DateTime
                                                            .tryParse(_inputs[
                                                                    'date_of_birth']!
                                                                .text) ??
                                                        DateTime(
                                                            now.year - 25,
                                                            now.month,
                                                            now.day));
                                                if (selected != null &&
                                                    mounted) {
                                                  _inputs['date_of_birth']!
                                                          .text =
                                                      selected
                                                          .toIso8601String()
                                                          .substring(0, 10);
                                                }
                                              })),
                                _field('height_cm', 'Chiều cao (cm)',
                                    maximum: 300),
                                _field('weight_kg', 'Cân nặng (kg)',
                                    maximum: 500),
                                DropdownButtonFormField<String>(
                                    initialValue: _fitness,
                                    decoration: const InputDecoration(
                                        labelText: 'Thể lực tự đánh giá',
                                        border: OutlineInputBorder()),
                                    items: const [
                                      DropdownMenuItem(
                                          value: null,
                                          child: Text('Chưa cập nhật')),
                                      DropdownMenuItem(
                                          value: 'fit', child: Text('Khỏe')),
                                      DropdownMenuItem(
                                          value: 'normal',
                                          child: Text('Bình thường')),
                                      DropdownMenuItem(
                                          value: 'low_fitness',
                                          child: Text('Thể lực yếu'))
                                    ],
                                    onChanged: _saving
                                        ? null
                                        : (value) =>
                                            setState(() => _fitness = value)),
                                _heading('Ghi chú sức khỏe'),
                                _field('medical_notes',
                                    'Bệnh nền, dị ứng hoặc lưu ý khác',
                                    lines: 4,
                                    keyboard: TextInputType.multiline),
                                _heading('Liên hệ khẩn cấp'),
                                _field('emergency_contact_name',
                                    'Họ tên người liên hệ'),
                                _field('emergency_contact_phone',
                                    'Số điện thoại người liên hệ',
                                    keyboard: TextInputType.phone),
                                FilledButton.icon(
                                    onPressed: _saving ? null : _save,
                                    icon: const Icon(Icons.save_outlined),
                                    label: Text(_saving
                                        ? 'Đang lưu…'
                                        : 'Lưu hồ sơ sức khỏe')),
                              ])))));
}
