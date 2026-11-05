import '../entities/mission.dart';

abstract interface class MissionRepository {
  Future<List<Mission>> getMissions();

  Future<Mission> completeMission(int id);
}
