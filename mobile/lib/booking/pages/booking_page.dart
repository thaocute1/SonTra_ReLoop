import 'package:flutter/material.dart';

import '../../tours/domain/entities/tour.dart';
import '../../auth/data/services/auth_session.dart';
import '../data/booking_repository.dart';
import '../domain/entities/booking.dart';
import '../domain/usecases/create_booking_use_case.dart';
import 'payment_page.dart';

class BookingPage extends StatefulWidget {
  const BookingPage({super.key, required this.tour});

  final Tour tour;

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController =
      TextEditingController(text: AuthSession.userName ?? '');
  late final TextEditingController _phoneController =
      TextEditingController(text: AuthSession.userPhone ?? '');
  late final TextEditingController _emailController =
      TextEditingController(text: AuthSession.userEmail ?? '');
  TourSchedule? _schedule;
  int _adults = 1;
  int _children = 0;
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final apiSchedules = widget.tour.schedules
        .where((item) => item.status == 'open' && item.remainingSlots > 0)
        .toList();
    final schedules =
        apiSchedules.isEmpty ? _fallbackSchedules() : apiSchedules;
    _schedule ??= schedules.isEmpty ? null : schedules.first;
    final unitPrice = _schedule?.price ?? widget.tour.price;
    final total = unitPrice * _adults + (unitPrice * 0.7 * _children).round();
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
          title: const Text('Đặt tour'),
          backgroundColor: const Color(0xFFF8FAF8)),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            Text(widget.tour.title,
                style:
                    const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            const Text('Lịch khởi hành',
                style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            DropdownButtonFormField<TourSchedule>(
              initialValue: _schedule,
              items: [
                for (final item in schedules)
                  DropdownMenuItem(
                      value: item,
                      child: Text(
                          '${item.formattedDate}  ${item.startTime} - ${item.endTime}')),
              ],
              onChanged: (value) => setState(() => _schedule = value),
              decoration: const InputDecoration(
                  border: OutlineInputBorder(), labelText: 'Chọn ngày và giờ'),
            ),
            if (apiSchedules.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Lịch cụ thể sẽ được backend xác nhận theo chuyến mở gần nhất.',
                  style: TextStyle(color: Color(0xFF718078), fontSize: 11),
                ),
              ),
            const SizedBox(height: 16),
            _counter('Người lớn', _adults,
                (value) => setState(() => _adults = value)),
            _counter('Trẻ em', _children,
                (value) => setState(() => _children = value)),
            const SizedBox(height: 8),
            const Text('Thông tin khách hàng',
                style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Họ và tên',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Vui lòng nhập họ và tên'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.phone_outlined),
              ),
              validator: (value) {
                final phone = value?.trim() ?? '';
                if (phone.isEmpty) return 'Vui lòng nhập số điện thoại';
                if (!RegExp(r'^[0-9+ ]{9,15}$').hasMatch(phone)) {
                  return 'Số điện thoại không hợp lệ';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Email (không bắt buộc)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.mail_outline),
              ),
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isNotEmpty && !email.contains('@')) {
                  return 'Email không hợp lệ';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            Text('Tổng thanh toán: ${_money(total)}',
                style: const TextStyle(
                    color: Color(0xFF4E7567),
                    fontSize: 17,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: _loading || _schedule == null ? null : _submit,
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4E7567)),
              child: _loading
                  ? const CircularProgressIndicator()
                  : const Text('Tiếp tục thanh toán'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _counter(String label, int value, ValueChanged<int> onChanged) =>
      Row(children: [
        Expanded(child: Text(label)),
        IconButton(
            onPressed: value == 0 ? null : () => onChanged(value - 1),
            icon: const Icon(Icons.remove_circle_outline)),
        Text('$value'),
        IconButton(
            onPressed: () => onChanged(value + 1),
            icon: const Icon(Icons.add_circle_outline)),
      ]);

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      final result = await const CreateBookingUseCase(BookingRepository())(
          BookingRequest(
              tourId: widget.tour.id,
              scheduleId: _schedule!.id,
              adults: _adults,
              children: _children,
              name: _nameController.text.trim(),
              phone: _phoneController.text.trim(),
              email: _emailController.text.trim(),
              pickupLocation: 'Trung tâm Đà Nẵng'));
      if (mounted) {
        Navigator.push(
            context,
            MaterialPageRoute<void>(
                builder: (_) => PaymentPage(booking: result)));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<TourSchedule> _fallbackSchedules() {
    final today = DateTime.now();
    return List.generate(5, (index) {
      final date = today.add(Duration(days: index + 1));
      return TourSchedule(
        id: 'SCH-DEFAULT-${index + 1}',
        date: '${date.year}-${date.month.toString().padLeft(2, '0')}-'
            '${date.day.toString().padLeft(2, '0')}',
        formattedDate: _dateText(date, '/'),
        startTime: '05:30',
        endTime: '09:30',
        remainingSlots: 15,
        price: widget.tour.price,
        status: 'open',
      );
    });
  }

  String _dateText(DateTime date, String separator) =>
      '${date.day.toString().padLeft(2, '0')}$separator'
      '${date.month.toString().padLeft(2, '0')}$separator${date.year}';

  String _money(int value) =>
      '${value.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
}
