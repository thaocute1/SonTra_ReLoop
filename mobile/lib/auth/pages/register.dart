import 'package:flutter/material.dart';

import '../data/repositories/register_repository_impl.dart';
import '../domain/entities/register_credentials.dart';
import '../domain/usecases/register_use_case.dart';
import 'login.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key, RegisterUseCase? registerUseCase})
    : registerUseCase =
          registerUseCase ?? const RegisterUseCase(RegisterRepositoryImpl());

  final RegisterUseCase registerUseCase;

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  static const _ink = Color(0xFF2D3732);
  static const _forest = Color(0xFF4A6B5D);
  static const _muted = Color(0xFF6B7A72);
  static const _line = Color(0xFFDDE5DF);

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmation = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _isLoading = true);
    await widget.registerUseCase(
      RegisterCredentials(
        fullName: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
      ),
    );
    if (!mounted) return;
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9F6),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 22, 18, 22),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _RegisterBrand(),
                    const SizedBox(height: 22),
                    const _RegisterIllustration(),
                    const SizedBox(height: 16),
                    const Text(
                      'Tạo tài khoản mới',
                      style: TextStyle(
                        color: _ink,
                        fontSize: 23,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 22),
                    _field(
                      label: 'Họ và tên',
                      hint: 'Nhập họ và tên',
                      icon: Icons.person_outline_rounded,
                      controller: _nameController,
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                          ? 'Vui lòng nhập họ và tên'
                          : null,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 15),
                    _field(
                      label: 'Email',
                      hint: 'Nhập email của bạn ',
                      icon: Icons.mail_outline_rounded,
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Vui lòng nhập email';
                        }
                        if (!value.contains('@')) {
                          return 'Email chưa đúng định dạng';
                        }
                        return null;
                      },
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 15),
                    _field(
                      label: 'Mật khẩu',
                      hint: 'Tối thiểu 6 ký tự',
                      icon: Icons.lock_outline_rounded,
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      suffix: _visibilityButton(
                        hidden: _obscurePassword,
                        onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword,
                        ),
                      ),
                      validator: (value) => value == null || value.length < 6
                          ? 'Mật khẩu cần ít nhất 6 ký tự'
                          : null,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 15),
                    _field(
                      label: 'Xác nhận mật khẩu',
                      hint: 'Nhập lại mật khẩu',
                      icon: Icons.lock_outline_rounded,
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirmation,
                      suffix: _visibilityButton(
                        hidden: _obscureConfirmation,
                        onPressed: () => setState(
                          () => _obscureConfirmation = !_obscureConfirmation,
                        ),
                      ),
                      validator: (value) => value != _passwordController.text
                          ? 'Mật khẩu xác nhận không khớp'
                          : null,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    const SizedBox(height: 17),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        onPressed: _isLoading ? null : _submit,
                        style: FilledButton.styleFrom(
                          backgroundColor: _forest,
                          disabledBackgroundColor: _forest.withValues(
                            alpha: .55,
                          ),
                          foregroundColor: Colors.white,
                          shape: const StadiumBorder(),
                          textStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Tạo tài khoản'),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Expanded(child: Divider(color: _line)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(
                            'hoặc tiếp tục với',
                            style: TextStyle(
                              color: _muted.withValues(alpha: .8),
                              fontSize: 11,
                            ),
                          ),
                        ),
                        const Expanded(child: Divider(color: _line)),
                      ],
                    ),
                    const SizedBox(height: 13),
                    Row(
                      children: [
                        Expanded(
                          child: _socialButton(
                            icon: Icons.g_mobiledata_rounded,
                            text: 'Google',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _socialButton(
                            icon: Icons.facebook_rounded,
                            text: 'Facebook',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Center(
                      child: TextButton(
                        onPressed: () => Navigator.of(context).pushReplacement(
                          MaterialPageRoute<void>(
                            builder: (_) => const LoginPage(),
                          ),
                        ),
                        child: const Text.rich(
                          TextSpan(
                            text: 'Đã có tài khoản? ',
                            style: TextStyle(color: _muted, fontSize: 11),
                            children: [
                              TextSpan(
                                text: 'Đăng nhập',
                                style: TextStyle(
                                  color: _forest,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
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

  Widget _field({
    required String label,
    required String hint,
    required IconData icon,
    required TextEditingController controller,
    required String? Function(String?) validator,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    bool obscureText = false,
    Widget? suffix,
    void Function(String)? onFieldSubmitted,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: _ink,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 5),
        TextFormField(
          controller: controller,
          validator: validator,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          obscureText: obscureText,
          onFieldSubmitted: onFieldSubmitted,
          style: const TextStyle(color: _ink, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: _muted, fontSize: 12),
            prefixIcon: Icon(icon, color: _muted, size: 17),
            suffixIcon: suffix,
            filled: true,
            fillColor: Colors.white,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 14,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _line),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _line),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _forest, width: 1.4),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFC95C54)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _visibilityButton({
    required bool hidden,
    required VoidCallback onPressed,
  }) {
    return IconButton(
      onPressed: onPressed,
      icon: Icon(
        hidden ? Icons.visibility_off_outlined : Icons.visibility_outlined,
        color: _muted,
        size: 18,
      ),
      tooltip: hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 36),
    );
  }

  Widget _socialButton({required IconData icon, required String text}) {
    return SizedBox(
      height: 40,
      child: OutlinedButton.icon(
        onPressed: () {},
        icon: Icon(icon, size: 17, color: _ink),
        label: Text(text, style: const TextStyle(fontSize: 12, color: _ink)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: _line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          padding: EdgeInsets.zero,
        ),
      ),
    );
  }
}

class _RegisterBrand extends StatelessWidget {
  const _RegisterBrand();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'Sơn Trà Reloop',
      style: TextStyle(
        color: Color(0xFF2D3732),
        fontSize: 16,
        fontWeight: FontWeight.w800,
        letterSpacing: .2,
      ),
    );
  }
}

class _RegisterIllustration extends StatelessWidget {
  const _RegisterIllustration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 170,
      width: double.infinity,
      child: Image.asset('assets/images/logotrang1.png', fit: BoxFit.contain),
    );
  }
}
