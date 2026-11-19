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
  List<TourSchedule> _schedules = [];
  int _adults = 1;
  int _children = 0;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _updateSchedules();
  }

  @override
  void didUpdateWidget(covariant BookingPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    _updateSchedules();
  }

  void _updateSchedules() {
    final byId = <String, TourSchedule>{};
    for (final schedule in widget.tour.schedules) {
      if (schedule.id.isNotEmpty &&
          schedule.status == 'open' &&
          schedule.remainingSlots > 0) {
        byId.putIfAbsent(schedule.id, () => schedule);
      }
    }
    _schedules = byId.values.toList();
    _schedule =
        byId[_schedule?.id] ?? (_schedules.isEmpty ? null : _schedules.first);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
            DropdownButtonFormField<String>(
              key: ValueKey(_schedule?.id),
              initialValue: _schedule?.id,
              items: [
                for (final item in _schedules)
                  DropdownMenuItem(
                      value: item.id,
                      child: Text(
                          '${item.formattedDate}  ${item.startTime} - ${item.endTime}')),
              ],
              onChanged: _loading || _schedules.isEmpty
                  ? null
                  : (value) => setState(() => _schedule =
                      _schedules.firstWhere((item) => item.id == value)),
              decoration: const InputDecoration(
                  border: OutlineInputBorder(), labelText: 'Chọn ngày và giờ'),
            ),
            if (_schedules.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Tour chưa có lịch khởi hành còn chỗ. Vui lòng chọn tour khác hoặc thử lại sau.',
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
    if (_loading || _schedule == null) return;
    if (!_formKey.currentState!.validate()) return;
    if (_adults < 1 || _adults + _children > _schedule!.remainingSlots) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'Cần ít nhất 1 người lớn và số khách không vượt quá số chỗ còn lại.')));
      return;
    }

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

  String _money(int value) =>
      '${value.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
}
