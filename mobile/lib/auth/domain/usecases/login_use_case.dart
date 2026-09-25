import '../entities/login_credentials.dart';
import '../repositories/auth_repository.dart';

class LoginUseCase {
  const LoginUseCase(this._repository);

  final AuthRepository _repository;

  Future<void> call(LoginCredentials credentials) {
    return _repository.login(credentials);
  }
}
