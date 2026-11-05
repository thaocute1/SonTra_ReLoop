import '../entities/tour.dart';

abstract interface class TourRepository {
  Future<List<Tour>> getTours();

  Future<Tour> getTour(int id);
}
