import '../entities/login_credentials.dart';

abstract interface class AuthRepository {
  Future<String?> login(LoginCredentials credentials);
}
