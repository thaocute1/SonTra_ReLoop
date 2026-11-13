import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../data/trip_repository.dart';
import '../domain/trip.dart';
import 'trip_map.dart';

class TripDetailPage extends StatefulWidget {
  const TripDetailPage(
      {super.key, required this.scheduleId, required this.guide});
  final int scheduleId;
  final bool guide;
  @override
  State<TripDetailPage> createState() => _TripDetailPageState();
}

class _TripDetailPageState extends State<TripDetailPage>
    with WidgetsBindingObserver {
  final _repo = TripRepository();
  TripDetail? _detail;
  String? _error;
  String _query = '';
  bool _busy = false, _loading = true, _sharing = false, _refreshing = false;
  int _pending = 0, _tab = 0;
  Timer? _refreshTimer, _locationTimer;
  String? _locationError;
  double _separationDistance = 300;
  Future<void>? _positionFlight;
  int get id => widget.scheduleId;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _refreshTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!_busy &&
          WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        _refresh(quiet: true);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    _locationTimer?.cancel();
    _repo.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh(quiet: true);
  }

  Future<void> _refresh({bool quiet = false}) async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final detail = await _repo.detail(id);
      final count = (await _repo.pending()).length;
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _error = null;
        _pending = count;
        _loading = false;
      });
      if (detail.trip.closed) {
        _locationTimer?.cancel();
        if (mounted) setState(() => _sharing = false);
      }
    } catch (e) {
      if (mounted && (!quiet || _detail == null)) {
        setState(() {
          _error = '$e';
          _loading = false;
        });
      }
    } finally {
      _refreshing = false;
    }
  }

  void _message(String text) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      await _refresh();
    } catch (e) {
      _message('$e');
    } finally {
      final count = (await _repo.pending()).length;
      if (mounted) setState(() => _pending = count);
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _input(String title,
      {String initial = '', String hint = '', bool required = true}) async {
    final controller = TextEditingController(text: initial);
    final result = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
              title: Text(title),
              content: TextField(
                  controller: controller,
                  autofocus: true,
                  maxLines: 4,
                  maxLength: 3000,
                  decoration: InputDecoration(hintText: hint)),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Hủy')),
                FilledButton(
                    onPressed: () {
                      if (!required || controller.text.trim().isNotEmpty) {
                        Navigator.pop(context, controller.text.trim());
                      }
                    },
                    child: const Text('Xác nhận'))
              ],
            ));
    // The dialog route can still be animating; its TextField owns no controller lifecycle.
    Future<void>.delayed(const Duration(seconds: 1), controller.dispose);
    return result;
  }

  Future<bool> _confirm(String title, String content) async =>
      await showDialog<bool>(
          context: context,
          builder: (context) =>
              AlertDialog(title: Text(title), content: Text(content), actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Quay lại')),
                FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Xác nhận')),
              ])) ??
      false;

  Future<void> _showPending() async {
    final pending = await _repo.pending();
    if (!mounted) return;
    await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (context) => SafeArea(
                child: SizedBox(
              height: MediaQuery.sizeOf(context).height * .7,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                const Text('Thao tác chưa gửi',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                for (final entry in pending)
                  ListTile(
                    title: Text(entry['payload']['kind'] == 'notice'
                        ? 'Thông báo'
                        : entry['payload']['kind'] == 'support'
                            ? 'Yêu cầu hỗ trợ / SOS'
                            : 'Điểm danh thành viên #${entry['payload']['participant_id']}'),
                    subtitle: Text(
                        '${_date(entry['at'])}\n${entry['payload']['content'] ?? attendanceLabels[entry['payload']['participant_status']] ?? ''}'),
                    trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        tooltip: 'Xóa thao tác này',
                        onPressed: () async {
                          Navigator.pop(context);
                          if (await _confirm('Xóa thao tác chưa gửi?',
                              'Thao tác này sẽ không được gửi lên máy chủ.')) {
                            await _run(() => _repo
                                .discard(text(entry['payload']['request_id'])));
                          }
                        }),
                  ),
              ]),
            )));
  }

  Future<void> _call(String phone) async {
    if (phone.trim().isEmpty) {
      _message('Chưa có số điện thoại.');
      return;
    }
    if (!await launchUrl(Uri(scheme: 'tel', path: phone.trim()))) {
      _message('Không mở được ứng dụng gọi điện. Số liên hệ: $phone');
    }
  }

  Future<void> _attendance(Participant person, String stage,
      {int? checkpoint}) async {
    final choices = switch (stage) {
      'departure' => ['present', 'absent', 'late', 'cancelled'],
      'checkpoint' => ['present', 'left_group'],
      _ => ['returned', 'early_return', 'left_group'],
    };
    final status = await showModalBottomSheet<String>(
        context: context,
        builder: (context) => SafeArea(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
              Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(person.name,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold))),
              for (final choice in choices)
                ListTile(
                    title: Text(attendanceLabels[choice]!),
                    onTap: () => Navigator.pop(context, choice)),
            ])));
    if (status == null || !mounted) return;
    final note = await _input('Ghi chú điểm danh',
        required: ['early_return', 'left_group'].contains(status),
        hint: status == 'early_return'
            ? 'Ghi người nhận bàn giao, thời gian và lý do về sớm'
            : 'Lý do hoặc tình trạng thành viên');
    if (note == null || !mounted) return;
    await _run(() async {
      final sent = await _repo.attendance(id, person.id, stage, status,
          checkpoint: checkpoint, note: note);
      _message(sent
          ? 'Đã lưu điểm danh trên hệ thống.'
          : 'Đã lưu tạm trên máy, chưa đồng bộ.');
    });
  }

  Future<void> _person(Participant person) async {
    await Navigator.push(
        context,
        MaterialPageRoute<void>(
            builder: (_) => ParticipantPage(
                participant: person,
                editable: widget.guide && !_detail!.trip.closed,
                onCall: _call,
                onSave: (data) => _repo.updatePerson(id, person.id, data))));
    if (mounted) await _refresh();
  }

  Future<void> _send({required bool notice, bool sos = false}) async {
    final content = await _input(
        notice
            ? 'Thông báo cho đoàn'
            : sos
                ? 'Gửi SOS'
                : 'Yêu cầu hỗ trợ',
        initial: sos ? 'Tôi cần được hỗ trợ khẩn cấp.' : '',
        hint: 'Mô tả nội dung và vị trí của bạn');
    if (content == null || !mounted) return;
    int? participantId;
    if (!notice) {
      final people = _detail!.participants;
      if (people.length == 1) {
        participantId = people.first.id;
      } else if (people.length > 1) {
        final selected = await showModalBottomSheet<int>(
            context: context,
            builder: (context) => SafeArea(
                    child: ListView(shrinkWrap: true, children: [
                  const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Ai cần hỗ trợ?',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold))),
                  ListTile(
                      title: const Text('Tôi / người đang sử dụng thiết bị'),
                      onTap: () => Navigator.pop(context, 0)),
                  for (final person in people)
                    ListTile(
                        title: Text(person.name),
                        onTap: () => Navigator.pop(context, person.id)),
                ])));
        if (selected == null || !mounted) return;
        if (selected > 0) participantId = selected;
      }
    }
    await _run(() async {
      final data = <String, dynamic>{
        'kind': notice ? 'notice' : 'support',
        'content': content,
        'sos': sos
      };
      if (participantId != null) data['participant_id'] = participantId;
      if (!notice) {
        try {
          if (await Geolocator.checkPermission() != LocationPermission.denied) {
            final p = await Geolocator.getCurrentPosition()
                .timeout(const Duration(seconds: 5));
            data.addAll({
              'latitude': p.latitude,
              'longitude': p.longitude,
              'captured_at': p.timestamp.toUtc().toIso8601String()
            });
          }
        } catch (_) {/* Support must still send when GPS is unavailable. */}
      }
      _message('Đang gửi...');
      final sent = await _repo.event(id, data);
      _message(sent
          ? notice
              ? 'Đã gửi thông báo cho đoàn.'
              : 'Hệ thống đã nhận. Đang chờ hướng dẫn viên xác nhận.'
          : 'Chưa gửi thành công. Đã lưu tạm; hãy gọi hướng dẫn viên nếu cần hỗ trợ ngay.');
    });
  }

  Future<void> _share() async {
    if (_sharing) {
      _locationTimer?.cancel();
      setState(() {
        _sharing = false;
        _locationError = 'Đang xóa vị trí đã chia sẻ...';
      });
      try {
        await _positionFlight;
        await _repo.stopSharing(id);
        if (mounted) setState(() => _locationError = null);
        await _refresh();
      } catch (_) {
        if (mounted) {
          setState(() => _locationError =
              'Đã dừng gửi GPS; chưa xóa được vị trí trên máy chủ. Bấm xóa lại khi có mạng.');
        }
      }
      return;
    }
    if (!await _confirm('Đồng ý chia sẻ vị trí?',
        'Hướng dẫn viên của chuyến này được xem vị trí thiết bị của bạn. Cập nhật mỗi 30 giây khi mở màn hình chuyến đi; dừng khi rời màn hình. Vị trí được xóa khi kết thúc chuyến và chỉ hiển thị tối đa 24 giờ.')) {
      return;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if ([LocationPermission.denied, LocationPermission.deniedForever]
        .contains(permission)) {
      _message('Cần cấp quyền vị trí trong cài đặt.');
      return;
    }
    if (!mounted) return;
    setState(() => _sharing = true);
    await _sendPosition();
    if (!mounted || !_sharing) return;
    _locationTimer =
        Timer.periodic(const Duration(seconds: 30), (_) => _sendPosition());
  }

  bool _sendingPosition = false;
  Future<void> _sendPosition() {
    if (_sendingPosition) return _positionFlight ?? Future<void>.value();
    return _positionFlight = _uploadPosition();
  }

  Future<void> _uploadPosition() async {
    if (_sendingPosition ||
        !_sharing ||
        WidgetsBinding.instance.lifecycleState != AppLifecycleState.resumed) {
      return;
    }
    _sendingPosition = true;
    try {
      final p = await Geolocator.getCurrentPosition(
              desiredAccuracy: LocationAccuracy.high)
          .timeout(const Duration(seconds: 10));
      if (!_sharing || !mounted) return;
      await _repo.position(id, {
        'latitude': p.latitude,
        'longitude': p.longitude,
        'accuracy': p.accuracy,
        'captured_at': p.timestamp.toUtc().toIso8601String()
      });
      if (mounted) setState(() => _locationError = null);
    } catch (_) {
      if (mounted) {
        setState(() => _locationError =
            'Chưa cập nhật được GPS. Kiểm tra mạng và quyền vị trí.');
      }
    } finally {
      _sendingPosition = false;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(_detail?.trip.title ?? 'Chi tiết chuyến'),
            actions: [
              IconButton(
                  onPressed: _busy ? null : () => _refresh(),
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Cập nhật'),
            ]),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _detail == null
                ? Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(_error ?? 'Không tải được chuyến đi'),
                    TextButton(
                        onPressed: _refresh, child: const Text('Thử lại'))
                  ]))
                : Column(children: [
                    if (_busy) const LinearProgressIndicator(),
                    if (_detail!.cached || _error != null)
                      MaterialBanner(
                          content: Text(_detail!.cached
                              ? 'Đang xem dữ liệu lưu trên máy. Vị trí và điểm danh có thể đã cũ.'
                              : _error!),
                          actions: [
                            TextButton(
                                onPressed: _refresh,
                                child: const Text('Thử lại'))
                          ]),
                    if (_pending > 0)
                      Container(
                          color: Colors.orange.shade50,
                          padding: const EdgeInsets.all(8),
                          child: Row(children: [
                            Expanded(
                                child: Text('$_pending thao tác chưa đồng bộ')),
                            TextButton(
                                onPressed: _busy
                                    ? null
                                    : () => _run(() async {
                                          await _repo.sync();
                                          _message('Đã đồng bộ.');
                                        }),
                                child: const Text('Đồng bộ')),
                            IconButton(
                                tooltip: 'Xem thao tác đang chờ',
                                onPressed: _busy ? null : _showPending,
                                icon: const Icon(Icons.list_alt)),
                          ])),
                    Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Wrap(spacing: 8, children: [
                          for (final (i, label) in [
                            'Tổng quan',
                            widget.guide ? 'Thành viên' : 'Thông tin của tôi',
                            'Lộ trình',
                            'Liên lạc'
                          ].indexed)
                            ChoiceChip(
                                label: Text(label),
                                selected: _tab == i,
                                onSelected: (_) => setState(() => _tab = i)),
                        ])),
                    Expanded(
                        child: RefreshIndicator(
                            onRefresh: _refresh,
                            child: ListView(
                                padding: const EdgeInsets.all(16),
                                physics: const AlwaysScrollableScrollPhysics(),
                                children: [
                                  if (_tab == 0) ..._overview(),
                                  if (_tab == 1) ..._people(),
                                  if (_tab == 2) ..._route(),
                                  if (_tab == 3) ..._communication(),
                                ]))),
                  ]),
      );

  Widget _heading(String title) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)));
  Widget _info(String title, String value) => ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title),
      subtitle: Text(value.isEmpty ? 'Chưa có thông tin' : value));
  List<Widget> _overview() {
    final detail = _detail!, trip = detail.trip;
    final people = detail.participants;
    final departed = people
        .where((p) => p.logs.any((l) =>
            l['stage'] == 'departure' &&
            ['present', 'late'].contains(l['status'])))
        .length;
    final returned = people
        .where((p) =>
            p.latest?['stage'] == 'return' &&
            ['returned', 'early_return'].contains(p.status))
        .length;
    final unresolved = people.where((p) => !p.resolved).length;
    return [
      Chip(avatar: const Icon(Icons.hiking, size: 18), label: Text(trip.label)),
      _info('Lịch khởi hành', '${trip.date}\n${trip.time}'),
      _info('Thời lượng dự kiến', '${trip.json['duration_hours'] ?? '—'} giờ'),
      _info(
          'Điểm tập trung',
          detail.checkpoints.isNotEmpty
              ? text(detail.checkpoints.first['name'])
              : 'Xem ghi chú từ đơn vị tổ chức'),
      _info('Ghi chú tổ chức', text(trip.json['special_notes'])),
      if (widget.guide)
        Card(
            child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                    '${people.length} thành viên · ${trip.json['booked_count']} vé đăng ký\n$departed có mặt lúc xuất phát · $returned đã về\n$unresolved người chưa xác nhận tình trạng kết thúc',
                    style: const TextStyle(height: 1.8)))),
      _info('Xuất phát thực tế', _date(trip.json['actual_started_at'])),
      _info('Kết thúc thực tế', _date(trip.json['actual_ended_at'])),
      if (trip.closed)
        _info('Báo cáo chuyến đi', text(trip.json['trip_report'])),
      if (widget.guide && !trip.closed && !trip.active)
        FilledButton.icon(
            onPressed: _busy || detail.cached || _pending > 0
                ? null
                : () async {
                    if (await _confirm('Bắt đầu chuyến đi?',
                        'Kiểm tra điểm danh từng người, kể cả khách vắng hoặc hủy. Đoàn đã sẵn sàng xuất phát?')) {
                      await _run(() => _repo.start(id));
                    }
                  },
            icon: const Icon(Icons.play_arrow),
            label: const Text('Bắt đầu chuyến đi')),
      if (widget.guide && trip.active)
        FilledButton.icon(
            onPressed: _busy || detail.cached || _pending > 0
                ? null
                : () async {
                    if (unresolved > 0) {
                      _message(
                          'Còn $unresolved người chưa xác nhận đã về, bàn giao hoặc không tham gia.');
                      return;
                    }
                    final report = await _input('Báo cáo kết thúc chuyến',
                        hint: 'Tình hình đoàn, sự cố và nội dung bàn giao');
                    if (report != null) {
                      await _run(() => _repo.finish(id, report));
                    }
                  },
            icon: const Icon(Icons.flag),
            label: const Text('Kết thúc và lưu báo cáo')),
      if (!widget.guide) ...[
        _info('Hướng dẫn viên', text(trip.json['guide_name'])),
        OutlinedButton.icon(
            onPressed: () => _call(text(trip.json['guide_phone'])),
            icon: const Icon(Icons.call),
            label:
                Text('Gọi hướng dẫn viên ${text(trip.json['guide_phone'])}')),
        if (trip.active)
          SwitchListTile(
              title: const Text('Chia sẻ vị trí thiết bị'),
              subtitle: const Text(
                  'Chỉ trong màn hình chuyến đi; cập nhật mỗi 30 giây'),
              value: _sharing,
              onChanged: _busy ? null : (_) => _share()),
        if (_locationError != null)
          Text(_locationError!,
              style: const TextStyle(color: Colors.deepOrange)),
        if (!_sharing && detail.positions.isNotEmpty)
          TextButton(
              onPressed: () => _run(() => _repo.stopSharing(id)),
              child: const Text('Xóa vị trí đã chia sẻ trên máy chủ')),
      ],
    ];
  }

  List<Widget> _people() {
    final trip = _detail!.trip;
    final people = _detail!.participants
        .where((p) => '${p.name} ${p.json['phone'] ?? ''}'
            .toLowerCase()
            .contains(_query.toLowerCase()))
        .toList();
    return [
      TextField(
          decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              labelText: 'Tìm tên hoặc số điện thoại'),
          onChanged: (v) => setState(() => _query = v)),
      if (people.isEmpty)
        const Padding(
            padding: EdgeInsets.all(24),
            child: Text('Không có thành viên phù hợp.')),
      for (final person in people)
        Card(
            child: Column(children: [
          ListTile(
              title: Text(person.name),
              subtitle: Text('${person.label}\n${text(person.json['phone'])}'),
              leading:
                  CircleAvatar(child: Text('${person.json['participant_no']}')),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _person(person)),
          if (widget.guide && !trip.closed)
            Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Wrap(spacing: 8, children: [
                  if (!trip.active)
                    TextButton(
                        onPressed: _busy
                            ? null
                            : () => _attendance(person, 'departure'),
                        child: const Text('Điểm danh xuất phát')),
                  if (trip.active)
                    TextButton(
                        onPressed:
                            _busy ? null : () => _attendance(person, 'return'),
                        child: const Text('Xác nhận về / rời đoàn')),
                  IconButton(
                      onPressed: () => _call(text(person.json['phone'])),
                      icon: const Icon(Icons.call_outlined),
                      tooltip: 'Gọi thành viên'),
                ])),
        ])),
    ];
  }

  List<Widget> _route() {
    final detail = _detail!;
    final alerts = detail.separationAlerts(_separationDistance);
    return [
      TripMap(detail: detail),
      if (widget.guide && detail.trip.active) ...[
        _heading('Cảnh báo thiết bị xa nhóm'),
        Text(
            'Ngưỡng ${_separationDistance.round()} m tới thiết bị gần nhất. Chỉ so sánh GPS trong 2 phút, sai số tối đa 100 m; cần ít nhất 2 thiết bị chia sẻ.'),
        Slider(
            value: _separationDistance,
            min: 100,
            max: 1000,
            divisions: 9,
            label: '${_separationDistance.round()} m',
            onChanged: (v) => setState(() => _separationDistance = v)),
        for (final alert in alerts)
          Card(
              color: Colors.orange.shade50,
              child: ListTile(
                  leading:
                      const Icon(Icons.warning_amber, color: Colors.deepOrange),
                  title: Text(
                      'Thiết bị #${alert['user_id']} cách nhóm ${alert['distance_m']} m'),
                  subtitle: const Text(
                      'Liên hệ để xác minh tình trạng thành viên.'))),
        if (alerts.isEmpty)
          const Text(
              'Chưa phát hiện thiết bị vượt ngưỡng trong dữ liệu GPS đủ điều kiện.'),
      ],
      _info(
          'Checkpoint tiếp theo',
          detail.checkpoints
                  .where((cp) => detail.participants.any(
                      (p) => !p.resolved && !p.atCheckpoint(integer(cp['id']))))
                  .firstOrNull?['name']
                  ?.toString() ??
              'Không còn checkpoint cần điểm danh'),
      _info('Cung đường',
          '${detail.route['total_distance_km'] ?? '—'} km · Độ cao tăng ${detail.route['elevation_gain_m'] ?? '—'} m'),
      for (final cp in detail.checkpoints)
        Card(
            child: ExpansionTile(
          title: Text('${cp['order_index']}. ${cp['name']}'),
          subtitle: Text(
              '${detail.participants.where((p) => p.atCheckpoint(integer(cp['id']))).length}/${detail.participants.length} người đã đến'),
          children: [
            if (text(cp['description']).isNotEmpty)
              Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(text(cp['description']))),
            if (widget.guide && detail.trip.active)
              for (final person
                  in detail.participants.where((p) => !p.resolved))
                ListTile(
                    title: Text(person.name),
                    trailing: Icon(person.atCheckpoint(integer(cp['id']))
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked),
                    onTap: _busy
                        ? null
                        : () => _attendance(person, 'checkpoint',
                            checkpoint: integer(cp['id']))),
          ],
        )),
      _heading('Vị trí đã chia sẻ'),
      const Text(
          'Vị trí thuộc thiết bị của người đặt vé, không đại diện cho toàn bộ khách trong cùng đơn. Dữ liệu quá 2 phút được đánh dấu cũ.'),
      if (detail.positions.isEmpty)
        const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Chưa có ai chia sẻ vị trí.')),
      for (final pos in detail.positions) _positionTile(pos),
    ];
  }

  Widget _positionTile(Json pos) {
    final p = Map<String, dynamic>.from(pos['payload']);
    final at = DateTime.tryParse(text(p['captured_at']));
    final stale = _detail!.cached ||
        at == null ||
        DateTime.now().toUtc().difference(at).inSeconds > 120;
    return ListTile(
        leading: Icon(stale ? Icons.gps_not_fixed : Icons.gps_fixed,
            color: stale ? Colors.orange : Colors.green),
        title: Text(
            'Thiết bị ${text(p['sender_name']).isEmpty ? '#${pos['user_id']}' : p['sender_name']}${stale ? ' · Vị trí cũ' : ''}'),
        subtitle: Text(
            '${p['latitude']}, ${p['longitude']}\nGPS: ${_date(p['captured_at'])} · Sai số ${p['accuracy'] ?? '—'} m'));
  }

  List<Widget> _communication() {
    final detail = _detail!;
    return [
      const Text(
          'Tự cập nhật mỗi 20 giây khi mở màn hình. Kéo xuống để cập nhật ngay.'),
      if (!detail.trip.closed)
        Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Wrap(spacing: 8, runSpacing: 8, children: [
              if (widget.guide)
                FilledButton.icon(
                    onPressed: _busy ? null : () => _send(notice: true),
                    icon: const Icon(Icons.campaign),
                    label: const Text('Gửi thông báo')),
              if (!widget.guide) ...[
                FilledButton.icon(
                    onPressed: _busy ? null : () => _send(notice: false),
                    icon: const Icon(Icons.support_agent),
                    label: const Text('Yêu cầu hỗ trợ')),
                FilledButton.icon(
                    style: FilledButton.styleFrom(
                        backgroundColor: Colors.red.shade700),
                    onPressed:
                        _busy ? null : () => _send(notice: false, sos: true),
                    icon: const Icon(Icons.sos),
                    label: const Text('SOS')),
              ],
            ])),
      if (!widget.guide)
        OutlinedButton.icon(
            onPressed: () => _call(text(detail.trip.json['guide_phone'])),
            icon: const Icon(Icons.call),
            label: const Text('Gọi hướng dẫn viên')),
      if (detail.events.isEmpty)
        const Padding(
            padding: EdgeInsets.all(24),
            child: Text('Chưa có thông báo hoặc yêu cầu hỗ trợ.')),
      for (final event in detail.events)
        Card(
            child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          event['kind'] == 'notice'
                              ? 'Thông báo hướng dẫn viên'
                              : event['payload']['sos'] == true
                                  ? 'SOS · ${event['payload']['sender_name'] ?? '#${event['user_id']}'}'
                                  : 'Yêu cầu hỗ trợ · ${event['payload']['sender_name'] ?? '#${event['user_id']}'}',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: event['payload']['sos'] == true
                                  ? Colors.red.shade700
                                  : null)),
                      const SizedBox(height: 8),
                      Text(text(event['payload']['content'])),
                      Text(_date(event['created_at']),
                          style: Theme.of(context).textTheme.bodySmall),
                      if (event['payload']['latitude'] != null)
                        Text(
                            'Vị trí: ${event['payload']['latitude']}, ${event['payload']['longitude']}\nGPS: ${_date(event['payload']['captured_at'])}'),
                      if (event['kind'] == 'support') ...[
                        if (event['participant_id'] != null)
                          Text(
                              'Thành viên: ${detail.participants.where((p) => p.id == integer(event['participant_id'])).firstOrNull?.name ?? '#${event['participant_id']}'}'),
                        if (widget.guide &&
                            text(event['payload']['sender_phone']).isNotEmpty)
                          OutlinedButton.icon(
                              onPressed: () =>
                                  _call(text(event['payload']['sender_phone'])),
                              icon: const Icon(Icons.call),
                              label: const Text('Gọi người gửi yêu cầu')),
                        Text(supportLabels[event['status']] ??
                            text(event['status'])),
                        if (widget.guide && event['status'] != 'resolved')
                          TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => _run(() => _repo.handleSupport(
                                      id,
                                      integer(event['id']),
                                      event['status'] == 'received'
                                          ? 'acknowledged'
                                          : 'resolved')),
                              child: Text(event['status'] == 'received'
                                  ? 'Xác nhận đã nhận'
                                  : 'Đánh dấu đã xử lý')),
                      ],
                    ]))),
    ];
  }
}

String _date(dynamic value) {
  final date = DateTime.tryParse(text(value))?.toLocal();
  if (date == null) return '';
  return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

class ParticipantPage extends StatefulWidget {
  const ParticipantPage(
      {super.key,
      required this.participant,
      required this.editable,
      required this.onCall,
      required this.onSave});
  final Participant participant;
  final bool editable;
  final Future<void> Function(String) onCall;
  final Future<void> Function(Json) onSave;
  @override
  State<ParticipantPage> createState() => _ParticipantPageState();
}

class _ParticipantPageState extends State<ParticipantPage> {
  static const fields = {
    'full_name': 'Họ tên',
    'phone': 'Số điện thoại',
    'emergency_contact_name': 'Người liên hệ khẩn cấp',
    'emergency_contact_phone': 'Điện thoại khẩn cấp',
    'special_notes': 'Ghi chú do khách cung cấp'
  };
  late final controllers = {
    for (final key in fields.keys)
      key: TextEditingController(text: text(widget.participant.json[key]))
  };
  bool _saving = false;
  @override
  void dispose() {
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: Text(widget.participant.name)),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        for (final field in fields.entries)
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextField(
                  controller: controllers[field.key],
                  readOnly: !widget.editable || _saving,
                  maxLines: field.key == 'special_notes' ? 3 : 1,
                  decoration: InputDecoration(
                      labelText: field.value,
                      border: const OutlineInputBorder()),
                  keyboardType: field.key.contains('phone')
                      ? TextInputType.phone
                      : TextInputType.text)),
        Wrap(spacing: 8, children: [
          OutlinedButton.icon(
              onPressed: () => widget.onCall(controllers['phone']!.text),
              icon: const Icon(Icons.call),
              label: const Text('Gọi thành viên')),
          OutlinedButton.icon(
              onPressed: () =>
                  widget.onCall(controllers['emergency_contact_phone']!.text),
              icon: const Icon(Icons.emergency),
              label: const Text('Gọi liên hệ khẩn cấp')),
        ]),
        if (widget.editable)
          FilledButton(
              onPressed: _saving
                  ? null
                  : () async {
                      if (controllers['full_name']!.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Vui lòng nhập họ tên.')));
                        return;
                      }
                      setState(() => _saving = true);
                      try {
                        await widget.onSave({
                          for (final entry in controllers.entries)
                            entry.key: entry.value.text.trim()
                        });
                        if (context.mounted) Navigator.pop(context);
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context)
                              .showSnackBar(SnackBar(content: Text('$e')));
                        }
                      } finally {
                        if (mounted) setState(() => _saving = false);
                      }
                    },
              child: Text(_saving ? 'Đang lưu...' : 'Lưu thông tin')),
        const SizedBox(height: 20),
        const Text('Lịch sử điểm danh',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        for (final log in widget.participant.logs)
          ListTile(
              title:
                  Text(attendanceLabels[log['status']] ?? text(log['status'])),
              subtitle: Text('${{
                    'departure': 'Xuất phát',
                    'checkpoint': 'Checkpoint',
                    'return': 'Khi về'
                  }[log['stage']] ?? log['stage']} ${log['checkpoint_id'] ?? ''}\n${_date(log['confirmed_at'])} · HDV #${log['confirmed_by_guide_id']}\n${text(log['note'])}')),
      ]));
}
