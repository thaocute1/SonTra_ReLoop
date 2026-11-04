import '../entities/dashboard_summary.dart';
import '../../data/repositories/dashboard_repository_impl.dart';

class GetDashboardUseCase {
  const GetDashboardUseCase(this.repository);

  final DashboardRepositoryImpl repository;

  DashboardSummary call() => repository.getSummary();
}
