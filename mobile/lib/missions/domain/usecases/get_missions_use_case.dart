import '../entities/mission.dart';
import '../repositories/mission_repository.dart';

class GetMissionsUseCase {
  const GetMissionsUseCase(this._repository);

  final MissionRepository _repository;

  Future<List<Mission>> call() => _repository.getMissions();
}
