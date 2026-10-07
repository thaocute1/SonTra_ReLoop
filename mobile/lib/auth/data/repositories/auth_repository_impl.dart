import '../../domain/entities/login_credentials.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl();

  @override
  Future<void> login(LoginCredentials credentials) async {
    await Future<void>.delayed(const Duration(milliseconds: 650));
  }
}
