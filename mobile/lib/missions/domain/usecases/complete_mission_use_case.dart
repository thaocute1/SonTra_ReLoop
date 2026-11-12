import '../entities/mission.dart';
import '../repositories/mission_repository.dart';

class CompleteMissionUseCase {
  const CompleteMissionUseCase(this._repository);

  final MissionRepository _repository;

  Future<Mission> call(
    int id, {
    String? proofPath,
    String note = '',
    double? latitude,
    double? longitude,
    double? gpsAccuracy,
  }) =>
      _repository.completeMission(
        id,
        proofPath: proofPath,
        note: note,
        latitude: latitude,
        longitude: longitude,
        gpsAccuracy: gpsAccuracy,
      );
}
