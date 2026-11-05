import '../entities/tour.dart';
import '../repositories/tour_repository.dart';

class GetSafeToursUseCase {
  const GetSafeToursUseCase(this._repository);

  final TourRepository _repository;

  Future<List<Tour>> call() => _repository.getTours();
}
