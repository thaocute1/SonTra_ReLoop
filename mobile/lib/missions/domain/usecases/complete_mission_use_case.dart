import '../entities/mission.dart';
import '../repositories/mission_repository.dart';

class CompleteMissionUseCase {
  const CompleteMissionUseCase(this._repository);

  final MissionRepository _repository;

  Future<Mission> call(int id) => _repository.completeMission(id);
}
