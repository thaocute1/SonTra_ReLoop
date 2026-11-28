import 'package:flutter/material.dart';

import '../data/services/password_recovery_service.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key, this.initialEmail = ''});

  final String initialEmail;

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  static const _forest = Color(0xFF4E7567);
  final _formKey = GlobalKey<FormState>();
  late final _emailController =
      TextEditingController(text: widget.initialEmail);
  bool _sending = false;
  String? _success;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending || !_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _sending = true;
      _error = null;
      _success = null;
    });
    try {
      final message = await const PasswordRecoveryService()
          .requestRecovery(_emailController.text);
      if (mounted) setState(() => _success = message);
    } catch (_) {
      if (mounted) {
        setState(() =>
            _error = 'Không thể gửi yêu cầu. Hãy kiểm tra kết nối và thử lại.');
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        appBar: AppBar(
          title: const Text('Quên mật khẩu'),
          backgroundColor: const Color(0xFFF8FAF8),
          foregroundColor: _forest,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 32),
                      const CircleAvatar(
                        radius: 48,
                        backgroundColor: Color(0xFFE6EFEB),
                        child: Icon(Icons.lock_reset, size: 52, color: _forest),
                      ),
                      const SizedBox(height: 32),
                      const Text('Khôi phục mật khẩu',
                          style: TextStyle(
                              color: Color(0xFF2D3732),
                              fontSize: 28,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(height: 12),
                      const Text(
                        'Nhập email đã đăng ký để gửi yêu cầu khôi phục tài khoản.',
                        style: TextStyle(color: Color(0xFF6B7A72), height: 1.5),
                      ),
                      const SizedBox(height: 28),
                      TextFormField(
                        hintLocales: const [
                          Locale('vi', 'VN'),
                          Locale('en', 'US')
                        ],
                        controller: _emailController,
                        enabled: !_sending,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.email],
                        autocorrect: false,
                        onFieldSubmitted: (_) => _submit(),
                        onChanged: (_) => setState(() {
                          _success = null;
                          _error = null;
                        }),
                        decoration: InputDecoration(
                          labelText: 'Email đã đăng ký',
                          hintText: 'ten@email.com',
                          prefixIcon: const Icon(Icons.mail_outline),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (email.isEmpty) return 'Vui lòng nhập email';
                          if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                              .hasMatch(email)) {
                            return 'Vui lòng nhập email hợp lệ';
                          }
                          return null;
                        },
                      ),
                      if (_error != null || _success != null) ...[
                        const SizedBox(height: 20),
                        Semantics(
                          liveRegion: true,
                          child: Text(
                            _error ?? _success!,
                            style: TextStyle(
                                color: _error != null
                                    ? Theme.of(context).colorScheme.error
                                    : _forest,
                                height: 1.5),
                          ),
                        ),
                        if (_success != null)
                          const Text(
                            'Bạn có thể kiểm tra thêm thư mục spam hoặc thư rác.',
                            style: TextStyle(height: 1.5),
                          ),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 52,
                        child: FilledButton(
                          onPressed:
                              _sending || _success != null ? null : _submit,
                          style: FilledButton.styleFrom(
                            backgroundColor: _forest,
                            shape: const StadiumBorder(),
                          ),
                          child: _sending
                              ? const SizedBox.square(
                                  dimension: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : Text(_success != null
                                  ? 'Đã gửi yêu cầu'
                                  : 'Gửi yêu cầu khôi phục'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: TextButton.styleFrom(foregroundColor: _forest),
                        child: const Text('Quay lại đăng nhập'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
