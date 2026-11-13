import 'package:flutter/material.dart';
import '../../auth/data/services/auth_session.dart';
import '../data/trip_repository.dart';
import '../domain/trip.dart';
import 'trip_detail_page.dart';

class GuideDashboardPage extends StatefulWidget {
  const GuideDashboardPage({super.key, this.onLogout, this.guide = true});
  final VoidCallback? onLogout;
  final bool guide;
  @override
  State<GuideDashboardPage> createState() => _GuideDashboardPageState();
}

class _GuideDashboardPageState extends State<GuideDashboardPage> {
  final _repository = TripRepository();
  late Future<List<Trip>> _future;
  int _filter = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = _repository.trips(guide: widget.guide);
  }

  @override
  void dispose() {
    _repository.close();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(_load);
    try {
      await _future;
    } catch (_) {/* Render error with retry. */}
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(
                widget.guide ? 'Dẫn đoàn Sơn Trà' : 'Đoàn trekking của tôi'),
            actions: [
              IconButton(
                  onPressed: _refresh,
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Tải lại'),
              if (widget.onLogout != null)
                IconButton(
                    onPressed: widget.onLogout,
                    icon: const Icon(Icons.logout),
                    tooltip: 'Đăng xuất'),
            ]),
        body: Column(children: [
          Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                      'Xin chào, ${AuthSession.userName ?? ''}\n${widget.guide ? 'Các chuyến được phân công cho bạn' : 'Các chuyến đã thanh toán có danh sách thành viên'}',
                      style: Theme.of(context).textTheme.titleMedium))),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(spacing: 8, children: [
                for (final (index, label)
                    in ['Sắp đi', 'Đang đi', 'Lịch sử'].indexed)
                  ChoiceChip(
                      label: Text(label),
                      selected: _filter == index,
                      onSelected: (_) => setState(() => _filter = index)),
              ])),
          Expanded(
              child: FutureBuilder<List<Trip>>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError) {
                      return Center(
                          child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text('${snapshot.error}',
                                        textAlign: TextAlign.center),
                                    TextButton(
                                        onPressed: _refresh,
                                        child: const Text('Thử lại')),
                                  ])));
                    }
                    final all = snapshot.data ?? [];
                    final trips = all
                        .where((t) => switch (_filter) {
                              0 => !t.active && !t.closed,
                              1 => t.active,
                              _ => t.closed
                            })
                        .toList();
                    return RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView(
                            padding: const EdgeInsets.all(16),
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              if (all.any((t) => t.json['cached'] == true))
                                const Padding(
                                    padding: EdgeInsets.all(12),
                                    child: Text(
                                        'Đang xem danh sách lưu trên máy. Kết nối lại để cập nhật phân công.')),
                              if (trips.isEmpty)
                                const Padding(
                                    padding: EdgeInsets.all(36),
                                    child: Text('Chưa có chuyến trong mục này.',
                                        textAlign: TextAlign.center)),
                              for (final trip in trips)
                                Card(
                                    clipBehavior: Clip.antiAlias,
                                    child: ListTile(
                                      contentPadding: const EdgeInsets.all(16),
                                      leading: CircleAvatar(
                                          child: Icon(trip.active
                                              ? Icons.hiking
                                              : Icons.terrain)),
                                      title: Text(trip.title,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.bold)),
                                      subtitle: Text(
                                          '${trip.date}\n${trip.time}\n${trip.label} · ${trip.json['booked_count']} người đăng ký${widget.guide ? '\n${trip.json['present_count'] ?? 0}/${trip.json['participant_count'] ?? 0} thành viên có mặt' : ''}'),
                                      trailing: const Icon(Icons.chevron_right),
                                      onTap: () async {
                                        await Navigator.push(
                                            context,
                                            MaterialPageRoute<void>(
                                                builder: (_) => TripDetailPage(
                                                    scheduleId: trip.id,
                                                    guide: widget.guide)));
                                        if (mounted) {
                                          await _refresh();
                                        }
                                      },
                                    )),
                            ]));
                  })),
        ]),
      );
}
