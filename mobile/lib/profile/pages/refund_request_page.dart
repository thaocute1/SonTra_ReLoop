import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/profile_repository.dart';

class RefundRequestPage extends StatefulWidget {
  const RefundRequestPage(
      {super.key,
      required this.repository,
      required this.bookingId,
      required this.orderCode,
      required this.gateway});

  final ProfileRepository repository;
  final int bookingId;
  final String orderCode;
  final String gateway;

  @override
  State<RefundRequestPage> createState() => _RefundRequestPageState();
}

class _RefundRequestPageState extends State<RefundRequestPage> {
  static const _banks = {
    '970422': 'MB Bank',
    '970436': 'Vietcombank',
    '970407': 'Techcombank',
    '970418': 'BIDV',
    '970415': 'VietinBank',
    '970416': 'ACB',
    '970432': 'VPBank',
    '970423': 'TPBank',
    '970403': 'Sacombank',
    '970405': 'Agribank',
  };

  final _form = GlobalKey<FormState>();
  final _reason = TextEditingController();
  final _account = TextEditingController();
  final _holder = TextEditingController();
  String? _bank;
  String? _error;
  bool _sending = false;

  bool get _needsBank => !['vnpay', 'paypal'].contains(widget.gateway);

  @override
  void dispose() {
    _reason.dispose();
    _account.dispose();
    _holder.dispose();
    super.dispose();
  }

  String? _required(String? value) => value == null || value.trim().isEmpty
      ? 'Vui lòng điền thông tin này.'
      : null;

  Future<void> _submit() async {
    if (_sending || !_form.currentState!.validate()) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.repository.requestRefund(widget.bookingId, {
        'reason': _reason.text.trim(),
        if (_needsBank) ...{
          'bank_bin': _bank!,
          'bank_name': _banks[_bank]!,
          'account_number': _account.text.trim(),
          'account_holder': _holder.text.trim(),
        },
      });
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() => _error = '$error'.replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Yêu cầu hoàn tiền')),
        body: SafeArea(
            child: Form(
                key: _form,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Text('Mã đơn: ${widget.orderCode}',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    const Text(
                        'Yêu cầu hủy tour và hoàn tiền sẽ được gửi đến quản trị viên để xét duyệt.'),
                    const SizedBox(height: 16),
                    TextFormField(
                        hintLocales: const [
                          Locale('vi', 'VN'),
                          Locale('en', 'US')
                        ],
                        controller: _reason,
                        enabled: !_sending,
                        minLines: 3,
                        maxLines: 5,
                        maxLength: 1000,
                        validator: _required,
                        decoration: const InputDecoration(
                            labelText: 'Lý do hủy và hoàn tiền',
                            border: OutlineInputBorder())),
                    if (_needsBank) ...[
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                          initialValue: _bank,
                          isExpanded: true,
                          decoration: const InputDecoration(
                              labelText: 'Ngân hàng nhận tiền',
                              border: OutlineInputBorder()),
                          items: [
                            for (final entry in _banks.entries)
                              DropdownMenuItem(
                                  value: entry.key, child: Text(entry.value))
                          ],
                          validator: _required,
                          onChanged: _sending
                              ? null
                              : (value) => setState(() => _bank = value)),
                      const SizedBox(height: 12),
                      TextFormField(
                          hintLocales: const [
                            Locale('vi', 'VN'),
                            Locale('en', 'US')
                          ],
                          controller: _account,
                          enabled: !_sending,
                          maxLength: 32,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly
                          ],
                          keyboardType: TextInputType.number,
                          validator: _required,
                          decoration: const InputDecoration(
                              labelText: 'Số tài khoản',
                              border: OutlineInputBorder(),
                              counterText: '')),
                      const SizedBox(height: 12),
                      TextFormField(
                          hintLocales: const [
                            Locale('vi', 'VN'),
                            Locale('en', 'US')
                          ],
                          controller: _holder,
                          enabled: !_sending,
                          maxLength: 120,
                          textCapitalization: TextCapitalization.words,
                          validator: _required,
                          decoration: const InputDecoration(
                              labelText: 'Tên chủ tài khoản',
                              border: OutlineInputBorder(),
                              counterText: '')),
                    ] else
                      const Text(
                          'Nếu được duyệt, tiền sẽ được hoàn qua phương thức đã thanh toán.'),
                    const SizedBox(height: 16),
                    if (_error != null)
                      Text(_error!,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error)),
                    FilledButton(
                        onPressed: _sending ? null : _submit,
                        child: Text(
                            _sending ? 'Đang gửi…' : 'Gửi yêu cầu hoàn tiền')),
                  ],
                ))),
      );
}
