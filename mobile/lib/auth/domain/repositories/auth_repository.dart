import '../entities/login_credentials.dart';

abstract interface class AuthRepository {
  Future<void> login(LoginCredentials credentials);
}
