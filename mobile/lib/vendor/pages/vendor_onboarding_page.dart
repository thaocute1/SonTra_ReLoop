import 'package:flutter/material.dart';
import '../data/vendor_repository_impl.dart';

class VendorOnboardingPage extends StatefulWidget {
  const VendorOnboardingPage({super.key});
  @override
  State<VendorOnboardingPage> createState() => _VendorOnboardingPageState();
}

class _VendorOnboardingPageState extends State<VendorOnboardingPage> {
  final _api = VendorRepositoryImpl();
  final _form = GlobalKey<FormState>();
  final _labels = {
    'brand_name': 'Tên doanh nghiệp',
    'description': 'Mô tả doanh nghiệp',
    'service_type': 'Loại hình dịch vụ',
    'phone': 'Hotline',
    'email': 'Email doanh nghiệp',
    'business_license_code': 'Mã giấy phép kinh doanh',
    'password': 'Mật khẩu đối tác'
  };
  late final _inputs = {
    for (final key in _labels.keys)
      key: TextEditingController(text: key == 'service_type' ? 'Trekking' : '')
  };
  bool _review = false,
      _safety = false,
      _esg = false,
      _busy = false,
      _done = false;
  String? _error;
  @override
  void dispose() {
    _api.close();
    for (final c in _inputs.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy || !_safety || !_esg) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api
          .request('vendors/register/', method: 'POST', body: <String, dynamic>{
        for (final e in _inputs.entries)
          e.key: e.key == 'password' ? e.value.text : e.value.text.trim(),
        'safety_commitment': _safety,
        'esg_fund_commitment': _esg
      });
      if (mounted) setState(() => _done = true);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Đăng ký đối tác')),
      body: SafeArea(
          child: ListView(padding: const EdgeInsets.all(24), children: [
        Text('Đồng hành cùng Sơn Trà REloop',
            style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        const Text(
            'Quản lý trải nghiệm và tuyến GPS, điều phối hướng dẫn viên và minh bạch Quỹ Bảo tồn Sơn Trà.'),
        const SizedBox(height: 24),
        if (_done) ...[
          const Icon(Icons.task_alt, color: Colors.green, size: 64),
          const Text('Đã gửi hồ sơ • Chờ BQL thẩm định'),
          Text(_inputs['brand_name']!.text),
          const Text('Tài khoản đăng nhập được sau khi BQL phê duyệt.'),
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Về đăng nhập')),
        ] else if (!_review) ...[
          const Text('Bước 1/2 • Thông tin doanh nghiệp'),
          Form(
              key: _form,
              child: Column(children: [
                for (final e in _labels.entries)
                  Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: TextFormField(
                          key: ValueKey(e.key),
                          controller: _inputs[e.key],
                          hintLocales: const [
                            Locale('vi', 'VN'),
                            Locale('en', 'US')
                          ],
                          keyboardType: e.key == 'email'
                              ? TextInputType.emailAddress
                              : e.key == 'phone'
                                  ? TextInputType.phone
                                  : e.key == 'description'
                                      ? TextInputType.multiline
                                      : TextInputType.text,
                          minLines: e.key == 'description' ? 3 : 1,
                          maxLines: e.key == 'description' ? 5 : 1,
                          obscureText: e.key == 'password',
                          decoration: InputDecoration(labelText: e.value),
                          validator: (v) {
                            final text = v?.trim() ?? '';
                            if (text.isEmpty) {
                              return 'Vui lòng nhập ${e.value.toLowerCase()}';
                            }
                            if (e.key == 'brand_name' && text.length < 2) {
                              return 'Tên cần ít nhất 2 ký tự';
                            }
                            if (e.key == 'description' && text.length < 10) {
                              return 'Mô tả cần ít nhất 10 ký tự';
                            }
                            if (e.key == 'email' &&
                                !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                    .hasMatch(text)) {
                              return 'Email không hợp lệ';
                            }
                            if (e.key == 'phone' &&
                                !RegExp(r'^(0|\+84)\d{8,10}$').hasMatch(text)) {
                              return 'Hotline không hợp lệ';
                            }
                            if (e.key == 'password' && (v?.length ?? 0) < 8) {
                              return 'Mật khẩu cần ít nhất 8 ký tự';
                            }
                            return null;
                          }))
              ])),
          const Text(
              'Hệ thống hiện tiếp nhận mã GPKD. API đăng ký chưa hỗ trợ lưu tệp giấy phép và logo.'),
          FilledButton(
              onPressed: () {
                if (_form.currentState!.validate()) {
                  setState(() => _review = true);
                }
              },
              child: const Text('Tiếp tục')),
        ] else ...[
          const Text('Bước 2/2 • Xác minh & cam kết'),
          for (final e in _labels.entries.where((e) => e.key != 'password'))
            ListTile(
                title: Text(e.value), subtitle: Text(_inputs[e.key]!.text)),
          CheckboxListTile(
              value: _safety,
              onChanged: _busy ? null : (v) => setState(() => _safety = v!),
              title: const Text(
                  'Tuân thủ an toàn rừng, PCCC và bảo vệ voọc chà vá chân nâu.')),
          CheckboxListTile(
              value: _esg,
              onChanged: _busy ? null : (v) => setState(() => _esg = v!),
              title: const Text(
                  'Đồng ý trích 10% phí đơn hàng vào Quỹ Bảo tồn & Cứu hộ Sơn Trà.')),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          FilledButton(
              onPressed: _busy || !_safety || !_esg ? null : _submit,
              child: Text(_busy ? 'Đang gửi…' : 'Gửi hồ sơ')),
          TextButton(
              onPressed: _busy ? null : () => setState(() => _review = false),
              child: const Text('Quay lại chỉnh sửa')),
        ],
      ])));
}
