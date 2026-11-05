import '../entities/booking.dart';
import '../../data/booking_repository.dart';

class CreateBookingUseCase {
  const CreateBookingUseCase(this.repository);

  final BookingRepository repository;

  Future<BookingResult> call(BookingRequest request) =>
      repository.createBooking(request);
}
