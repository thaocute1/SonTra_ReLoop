import '../../domain/entities/register_credentials.dart';
import '../../domain/repositories/register_repository.dart';

class RegisterRepositoryImpl implements RegisterRepository {
  const RegisterRepositoryImpl();

  @override
  Future<void> register(RegisterCredentials credentials) async {
    await Future<void>.delayed(const Duration(milliseconds: 650));
  }
}
