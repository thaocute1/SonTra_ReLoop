import '../entities/register_credentials.dart';

abstract interface class RegisterRepository {
  Future<void> register(RegisterCredentials credentials);
}
