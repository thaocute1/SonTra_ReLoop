import 'package:flutter/material.dart';

import '../data/repositories/auth_repository_impl.dart';
import '../data/services/social_auth_service.dart';
import '../data/services/auth_session.dart';
import '../domain/entities/login_credentials.dart';
import '../domain/usecases/login_use_case.dart';
import '../../dashboard/pages/dashboard.dart';
import 'register.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, LoginUseCase? loginUseCase})
      : loginUseCase = loginUseCase ?? const LoginUseCase(AuthRepositoryImpl());

  final LoginUseCase loginUseCase;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  static const _ink = Color(0xFF2D3732);
  static const _forest = Color(0xFF4E7567);
  static const _muted = Color(0xFF6B7A72);
  static const _line = Color(0xFFDDE5DF);

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _socialAuthService = const SocialAuthService();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _isLoading = true);
    try {
      final userName = await widget.loginUseCase(
        LoginCredentials(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        ),
      );
      if (mounted) {
        _openDashboard(
            userName: userName ?? _emailController.text.split('@').first);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_errorMessage(error, 'Đăng nhập thất bại.'))),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _errorMessage(Object error, String fallback) {
    final message = error.toString().replaceFirst('Exception: ', '').trim();
    return message.isEmpty ? fallback : message;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _BrandMark(),
                    const SizedBox(height: 42),
                    const _LoginIllustration(),
                    const SizedBox(height: 28),
                    const Text(
                      'Chào mừng trở lại!',
                      style: TextStyle(
                        color: _ink,
                        fontSize: 30,
                        height: 1.1,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Đăng nhập để tiếp tục hành trình khám phá Sơn Trà.',
                      style: TextStyle(
                        color: _muted,
                        fontSize: 14,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'Email hoặc số điện thoại',
                      style: TextStyle(
                        color: _ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: _inputDecoration(
                        hint: 'Nhập email của bạn',
                        icon: Icons.mail_outline_rounded,
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Vui lòng nhập email';
                        }
                        if (!value.contains('@')) {
                          return 'Email chưa đúng định dạng';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Mật khẩu',
                      style: TextStyle(
                        color: _ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: _inputDecoration(
                        hint: 'Nhập mật khẩu',
                        icon: Icons.lock_outline_rounded,
                      ).copyWith(
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: _muted,
                            size: 20,
                          ),
                          tooltip: _obscurePassword
                              ? 'Hiện mật khẩu'
                              : 'Ẩn mật khẩu',
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập mật khẩu';
                        }
                        if (value.length < 6) {
                          return 'Mật khẩu cần ít nhất 6 ký tự';
                        }
                        return null;
                      },
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(foregroundColor: _forest),
                        child: const Text('Quên mật khẩu?'),
                      ),
                    ),
                    const SizedBox(height: 6),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
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
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox.square(
                                dimension: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Đăng nhập'),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Row(
                      children: [
                        const Expanded(child: Divider(color: _line)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Text(
                            'hoặc',
                            style: TextStyle(
                              color: _muted.withValues(alpha: .8),
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const Expanded(child: Divider(color: _line)),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: _socialButton(
                            icon: Icons.g_mobiledata_rounded,
                            text: 'Google',
                            onPressed: _loginWithGoogle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _socialButton(
                            icon: Icons.facebook_rounded,
                            text: 'Facebook',
                            onPressed: _loginWithFacebook,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const RegisterPage(),
                          ),
                        ),
                        child: const Text.rich(
                          TextSpan(
                            text: 'Chưa có tài khoản? ',
                            style: TextStyle(color: _muted),
                            children: [
                              TextSpan(
                                text: 'Đăng ký ngay',
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

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: _muted, fontSize: 14),
      prefixIcon: Icon(icon, color: _forest, size: 20),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _forest, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFC95C54)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFC95C54), width: 1.5),
      ),
    );
  }

  Future<void> _loginWithGoogle() async {
    await _socialLogin(_socialAuthService.loginWithGoogle);
  }

  Future<void> _loginWithFacebook() async {
    await _socialLogin(_socialAuthService.loginWithFacebook);
  }

  Future<void> _socialLogin(Future<String?> Function() login) async {
    setState(() => _isLoading = true);
    try {
      final userName = await login();
      if (mounted) {
        _openDashboard(userName: userName);
      }
    } catch (error) {
      if (mounted) {
        final message = error.toString().replaceFirst('Exception: ', '').trim();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(message.isEmpty ? 'Đăng nhập thất bại.' : message)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openDashboard({String? userName}) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(
        builder: (_) => DashboardPage(
          userName: userName,
          onLogout: () {
            AuthSession.clear();
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute<void>(builder: (_) => const LoginPage()),
              (route) => false,
            );
          },
        ),
      ),
      (route) => false,
    );
  }

  Widget _socialButton({
    required IconData icon,
    required String text,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        onPressed: _isLoading ? null : onPressed,
        icon: Icon(icon, size: 20),
        label: Text(text),
        style: OutlinedButton.styleFrom(
          foregroundColor: _ink,
          side: const BorderSide(color: _line),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          padding: EdgeInsets.zero,
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'SƠN TRÀ RELOOP',
      style: TextStyle(
        color: Color(0xFF2D3732),
        fontSize: 14,
        height: 1.05,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _LoginIllustration extends StatelessWidget {
  const _LoginIllustration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 220,
      width: double.infinity,
      child: Image.asset('assets/images/logotrang1.png', fit: BoxFit.contain),
    );
  }
}
