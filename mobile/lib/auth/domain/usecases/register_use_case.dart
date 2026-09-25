import '../entities/register_credentials.dart';
import '../repositories/register_repository.dart';

class RegisterUseCase {
  const RegisterUseCase(this._repository);

  final RegisterRepository _repository;

  Future<void> call(RegisterCredentials credentials) {
    return _repository.register(credentials);
  }
}
