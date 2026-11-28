class RegisterCredentials {
  const RegisterCredentials({
    required this.fullName,
    required this.email,
    required this.password,
    this.phone = '',
  });

  final String fullName;
  final String email;
  final String password;
  final String phone;
}
