import 'dart:async';
import 'package:flutter/material.dart';
import '../../chat/pages/chat_sheet.dart';
import '../data/vendor_repository_impl.dart';
import '../domain/vendor_repository.dart';
import 'vendor_action_form.dart';
import 'vendor_route_editor.dart';
import 'vendor_revenue_chart.dart';

class VendorPortalPage extends StatefulWidget {
  const VendorPortalPage({super.key, required this.onLogout, this.repository});
  final VoidCallback onLogout;
  final VendorRepository? repository;
  @override
  State<VendorPortalPage> createState() => _VendorPortalPageState();
}

class _VendorPortalPageState extends State<VendorPortalPage>
    with WidgetsBindingObserver {
  late final _api = widget.repository ?? VendorRepositoryImpl();
  static const titles = [
    'Tổng quan',
    'Trải nghiệm & GPS',
    'Lịch & Đơn đặt',
    'Hộp thư điều hành',
    'Doanh thu & Đối soát',
    'Hướng dẫn viên',
    'Hồ sơ doanh nghiệp',
    'Thông báo',
    'Flash Sale'
  ];
  static const paths = [
    'vendors/dashboard/',
    'vendors/tours/',
    'vendors/bookings/',
    'vendors/inbox/trips/',
    'vendors/dashboard/',
    'vendors/guides/',
    'vendors/profile/',
    'cms-chatbot/community/notifications/',
    'flash-sales/vendor/registrations/'
  ];
  int _tab = 0, _revision = 0;
  String _period = '3m', _search = '', _status = 'all';
  dynamic _data;
  String? _error;
  bool _loading = true, _busy = false;
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_tab == 7) _load(quiet: true);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load(quiet: true);
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    if (widget.repository == null) _api.close();
    super.dispose();
  }

  Future<void> _load({bool quiet = false}) async {
    final revision = ++_revision;
    if (!quiet) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final data = await _api.request(paths[_tab], query: {
        if (_tab == 0 || _tab == 4) 'period': _period,
        if (_tab == 7) 'role': 'vendor',
        if (_tab == 2 || _tab == 3) 'search': _search,
        if (_tab == 2 && _status != 'all') 'status': _status,
      });
      if (mounted && revision == _revision) {
        setState(() {
          _data = data;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted && revision == _revision) {
        setState(() {
          _loading = false;
          _error = '$e';
        });
      }
    }
  }

  void _select(int tab) {
    if (_busy) return;
    setState(() {
      _tab = tab;
      _data = null;
      _search = '';
      _status = 'all';
    });
    _load();
  }

  Future<void> _mutate(String path, VendorRecord body,
      {String method = 'POST'}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await _api.request(path, method: method, body: body);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Đã lưu thành công.')));
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _guideForm() async {
    final data = await showDialog<VendorRecord>(
        context: context, builder: (_) => const _GuideForm());
    if (data != null && mounted) await _mutate('vendors/guides/', data);
  }

  Future<void> _createExperience() async {
    final basic = await showDialog<VendorRecord>(
        context: context,
        builder: (_) =>
            const VendorActionForm(title: 'Bước 1/3 • Trải nghiệm', fields: {
              'title': 'Tên trải nghiệm',
              'description': 'Mô tả',
              'price': 'Giá niêm yết (đ)',
              'max_capacity': 'Sức chứa',
              'difficulty_level': 'Cấp độ khó'
            }, initial: {
              'price': 50000,
              'max_capacity': 15
            }, bounds: {
              'price': (50000, 999999999),
              'max_capacity': (1, 50)
            }, choices: {
              'difficulty_level': {
                'easy': 'Dễ • gia đình',
                'moderate': 'Trung bình',
                'challenging': 'Thử thách'
              }
            }));
    if (basic == null || !mounted) return;
    final points = await Navigator.push<List<VendorRecord>>(
        context, MaterialPageRoute(builder: (_) => const VendorRouteEditor()));
    if (points == null || !mounted) return;
    final schedule = await showDialog<VendorRecord>(
        context: context,
        builder: (_) => VendorActionForm(
                title: 'Bước 3/3 • Chuyến khởi hành đầu tiên',
                fields: const {
                  'departure_date': 'Ngày khởi hành',
                  'start_time': 'Giờ bắt đầu (HH:mm)',
                  'end_time': 'Giờ kết thúc (HH:mm)',
                  'max_capacity': 'Sức chứa'
                },
                initial: {
                  'start_time': '06:00',
                  'end_time': '10:30',
                  'max_capacity': basic['max_capacity']
                },
                bounds: const {
                  'max_capacity': (1, 50)
                }));
    if (schedule == null || !mounted) return;
    await _mutate('vendors/tours/', {
      ...basic,
      'checkpoints': points,
      'coordinates': [
        for (final cp in points) [cp['lat'], cp['lng']]
      ],
      'start_point': points.first['name'],
      'end_point': points.last['name'],
      'initial_schedule': {
        ...schedule,
        'time_slot': '${schedule['start_time']} - ${schedule['end_time']}'
      }
    });
  }

  Future<void> _action(String title, String path, Map<String, String> fields,
      {VendorRecord initial = const {},
      Map<String, Map<String, String>> choices = const {},
      Map<String, (num, num)> bounds = const {},
      String method = 'POST'}) async {
    final result = await showDialog<VendorRecord>(
        context: context,
        builder: (_) => VendorActionForm(
            title: title,
            fields: fields,
            initial: initial,
            choices: choices,
            bounds: bounds));
    if (result != null && mounted) await _mutate(path, result, method: method);
  }

  Future<void> _bookingForm() async {
    try {
      final tours = vendorRecords(await _api.request('vendors/tours/'));
      if (!mounted) return;
      final schedules = <String, String>{};
      final owners = <String, dynamic>{};
      for (final tour in tours) {
        for (final s in vendorRecords(tour['schedules'])) {
          schedules['${s['id']}'] =
              '${tour['title']} • ${s['departure_date']} • ${s['time_slot']}';
          owners['${s['id']}'] = tour['id'];
        }
      }
      if (schedules.isEmpty) {
        throw Exception('Vui lòng mở chuyến khởi hành trước khi tạo đơn.');
      }
      final result = await showDialog<VendorRecord>(
          context: context,
          builder: (_) =>
              VendorActionForm(title: 'Đặt chỗ cho khách', fields: const {
                'schedule_id': 'Chuyến khởi hành',
                'customer_name': 'Họ tên khách',
                'customer_phone': 'Số điện thoại',
                'adults_count': 'Người lớn',
                'children_count': 'Trẻ em (70% giá)',
                'payment_status': 'Thanh toán'
              }, initial: const {
                'adults_count': 1,
                'children_count': 0
              }, choices: {
                'schedule_id': schedules,
                'payment_status': const {
                  'pending': 'Chưa thanh toán',
                  'paid': 'Đã thanh toán'
                }
              }, bounds: const {
                'adults_count': (1, 40),
                'children_count': (0, 20)
              }));
      if (result != null && mounted) {
        await _mutate('vendors/bookings/create/',
            {...result, 'tour_id': owners['${result['schedule_id']}']});
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _assignGuide(VendorRecord schedule) async {
    try {
      final guides = vendorRecords(await _api.request('vendors/guides/'));
      if (!mounted) return;
      final chosen = await showDialog<String>(
          context: context,
          builder: (context) => SimpleDialog(
                  title: const Text('Phân công hướng dẫn viên'),
                  children: [
                    SimpleDialogOption(
                        onPressed: () => Navigator.pop(context, ''),
                        child: const Text('Bỏ phân công')),
                    for (final guide in guides)
                      SimpleDialogOption(
                          onPressed: () =>
                              Navigator.pop(context, '${guide['id']}'),
                          child: Text(
                              '${guide['name']} • ${guide['phone'] ?? ''}')),
                  ]));
      if (chosen != null && mounted) {
        await _mutate('tours/vendor/schedules/${schedule['id']}/guide/',
            {'guide_id': chosen.isEmpty ? null : int.parse(chosen)},
            method: 'PATCH');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _flashForm() async {
    try {
      final tours = vendorRecords(await _api.request('vendors/tours/'));
      if (!mounted) return;
      final sessions = vendorRecords(vendorRecord(_data)['sessions']);
      final published = tours.where((t) => t['status'] == 'published').toList();
      if (sessions.isEmpty || published.isEmpty) {
        throw Exception(
            'Cần có phiên nhận đăng ký và trải nghiệm đã xuất bản.');
      }
      await _action(
          'Đăng ký Flash Sale', 'flash-sales/vendor/register-item/', const {
        'session_id': 'Phiên giờ vàng',
        'tour_id': 'Trải nghiệm',
        'promo_price': 'Giá ưu đãi (đ)',
        'slot_quantity': 'Số suất'
      },
          choices: {
            'session_id': {
              for (final s in sessions)
                '${s['id']}': '${s['title'] ?? s['start_time']}'
            },
            'tour_id': {
              for (final t in published) '${t['id']}': '${t['title']}'
            }
          },
          bounds: const {
            'promo_price': (1, 999999999),
            'slot_quantity': (1, 10000)
          });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: Text(titles[_tab]), actions: [
        IconButton(
            onPressed: () => _select(7),
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'Thông báo'),
        IconButton(
            onPressed: () => _load(),
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới')
      ]),
      drawer: Drawer(
          child: SafeArea(
              child: ListView(children: [
        const ListTile(
            title: Text('SƠN TRÀ RELOOP'), subtitle: Text('Cổng đối tác')),
        for (var i = 0; i < titles.length; i++)
          ListTile(
              title: Text(titles[i]),
              selected: i == _tab,
              onTap: () {
                Navigator.pop(context);
                _select(i);
              }),
        ListTile(
            title: const Text('REloop Assistant'),
            leading: const Icon(Icons.auto_awesome),
            onTap: () {
              Navigator.pop(context);
              showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const FractionallySizedBox(
                      heightFactor: .92, child: ChatSheet()));
            }),
        ListTile(
            title: const Text('Đăng xuất'),
            onTap: () async {
              final yes = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                          title: const Text('Đăng xuất khỏi cổng đối tác?'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Ở lại')),
                            FilledButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Đăng xuất'))
                          ]));
              if (yes == true && mounted) widget.onLogout();
            })
      ]))),
      bottomNavigationBar: NavigationBar(
          selectedIndex: _tab < 5 ? _tab : 0,
          onDestinationSelected: _select,
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.dashboard_outlined), label: 'Tổng quan'),
            NavigationDestination(
                icon: Icon(Icons.terrain), label: 'Trải nghiệm'),
            NavigationDestination(
                icon: Icon(Icons.calendar_month), label: 'Đơn đặt'),
            NavigationDestination(
                icon: Icon(Icons.forum_outlined), label: 'Hộp thư'),
            NavigationDestination(
                icon: Icon(Icons.account_balance_wallet_outlined),
                label: 'Đối soát')
          ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!),
                        TextButton(
                            onPressed: () => _load(),
                            child: const Text('Thử lại'))
                      ])))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                      padding: const EdgeInsets.all(16),
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        if (_busy) const LinearProgressIndicator(),
                        ..._content()
                      ])));
  Widget _heading(String text) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(text, style: Theme.of(context).textTheme.titleLarge));
  Widget _card(String title, String subtitle,
          {Widget? trailing, VoidCallback? onTap}) =>
      Card(
          child: ListTile(
              title: Text(title),
              subtitle: Text(subtitle),
              trailing: trailing,
              onTap: onTap));
  String _money(dynamic value) =>
      '${(num.tryParse('$value') ?? 0).round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
  Widget _searchBox() => TextFormField(
      key: ValueKey(_tab),
      hintLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
      decoration: const InputDecoration(
          labelText: 'Tìm kiếm', prefixIcon: Icon(Icons.search)),
      onChanged: _tab == 1 ? (v) => setState(() => _search = v) : null,
      onFieldSubmitted: (v) {
        _search = v;
        _load();
      });
  List<Widget> _content() {
    final data = vendorRecord(_data);
    if (_tab == 8) {
      return [
        FilledButton(
            onPressed: _busy ? null : _flashForm,
            child: const Text('Đăng ký trải nghiệm')),
        _heading('Phiên đang nhận đăng ký'),
        for (final s in vendorRecords(data['sessions']))
          _card('${s['title'] ?? 'Phiên giờ vàng'}',
              '${s['start_time']} → ${s['end_time']}'),
        _heading('Lịch sử đăng ký'),
        for (final r in vendorRecords(data['registrations']))
          _card('${r['tour_title'] ?? r['tour_id']}',
              '${r['status']} • ${_money(r['promo_price'])} • ${r['slot_quantity']} suất'),
      ];
    }
    if (_tab == 0 || _tab == 4) {
      final metrics = vendorRecord(data['metrics']);
      final reconciliation = vendorRecord(data['reconciliation']);
      final summary = vendorRecord(reconciliation['summary']);
      return [
        _heading(
            '${vendorRecord(data['vendor_info'])['brand_name'] ?? 'Đối tác Sơn Trà'}'),
        Wrap(
            spacing: 8,
            children: {
              '7d': '7 ngày',
              '30d': '30 ngày',
              '3m': '3 tháng',
              '12m': '12 tháng'
            }
                .entries
                .map((e) => ChoiceChip(
                    label: Text(e.value),
                    selected: _period == e.key,
                    onSelected: (_) {
                      _period = e.key;
                      _load();
                    }))
                .toList()),
        if (_tab == 0) ...[
          _card('Doanh thu tháng này', _money(metrics['monthly_revenue'])),
          _card('Đơn đặt',
              '${metrics['total_bookings'] ?? 0} đơn • ${metrics['avg_rating'] ?? 0}/5 sao')
        ],
        for (final e in {
          'gross_amount': 'Doanh thu gộp',
          'vendor_net_amount': 'Thực nhận đối tác',
          'conservation_fund': 'Quỹ bảo tồn ESG',
          'platform_fee': 'Phí nền tảng',
          'pending_amount': 'Chờ đối soát / chi trả',
          'on_hold_amount': 'Tạm giữ',
          'paid_amount': 'Đã chi trả'
        }.entries)
          _card(e.value, _money(summary[e.key])),
        _heading('Doanh thu theo kỳ'),
        VendorRevenueChart(
            key: ValueKey(_period),
            points: vendorRecords(vendorRecord(data['revenue_chart'])['data'])),
        if (_tab == 0) ...[
          _heading('Đơn đặt gần đây'),
          for (final row in vendorRecords(data['recent_bookings']))
            _card('#${row['order_code']}',
                '${row['customer_name'] ?? ''} • ${row['status_label'] ?? row['status']}',
                onTap: () => _select(2))
        ],
        if (_tab == 4) ...[
          _heading('Bút toán đối soát'),
          for (final row in vendorRecords(reconciliation['entries']))
            _card('#${row['order_code']} • ${row['status']}',
                '${row['recorded_at']}\nGộp: ${_money(row['gross_amount'])}\nESG: ${_money(row['conservation_fund'])} • Phí: ${_money(row['platform_fee'])}\nThực nhận: ${_money(row['vendor_net_amount'])}'),
          _heading('Lịch sử chi trả'),
          for (final row in vendorRecords(reconciliation['payouts']))
            _card('${row['batch_code']} • ${row['status']}',
                '${_money(row['amount'])}\n${row['created_at']} • ${row['reference'] ?? ''}')
        ]
      ];
    }
    if (_tab == 5) {
      return [
        FilledButton.icon(
            onPressed: _busy ? null : _guideForm,
            icon: const Icon(Icons.person_add_alt),
            label: const Text('Thêm hướng dẫn viên')),
        for (final row in vendorRecords(_data))
          _card('${row['name']}',
              '${row['email']}\n${row['phone'] ?? ''} • ${row['status']}'),
        if (vendorRecords(_data).isEmpty) const Text('Chưa có hướng dẫn viên.')
      ];
    }
    if (_tab == 6) {
      return [
        _heading('${data['brand_name'] ?? ''}'),
        for (final e in {
          'status': 'Trạng thái thẩm định',
          'rejection_reason': 'Ghi chú BQL',
          'business_license_code': 'Mã GPKD',
          'phone': 'Hotline',
          'account_email': 'Email tài khoản',
          'guides_count': 'Số hướng dẫn viên',
          'created_at': 'Ngày nộp'
        }.entries)
          _card(e.value, '${data[e.key] ?? '—'}'),
        _heading('Cam kết bảo tồn ESG'),
        const Text(
            'Tuân thủ an toàn rừng, PCCC, bảo vệ voọc chà vá chân nâu và giảm rác thải nhựa. Quỹ bảo tồn được ghi nhận theo sổ cái.')
      ];
    }
    if (_tab == 2) {
      return [
        FilledButton.icon(
            onPressed: _busy ? null : _bookingForm,
            icon: const Icon(Icons.add),
            label: const Text('Đặt chỗ cho khách')),
        _searchBox(),
        DropdownButton<String>(
            value: _status,
            isExpanded: true,
            items: {
              'all': 'Tất cả',
              'waiting_payment': 'Chờ thanh toán',
              'waiting_confirmation': 'Chờ xác nhận',
              'confirmed': 'Đã xác nhận',
              'completed': 'Hoàn thành',
              'cancelled': 'Đã hủy'
            }
                .entries
                .map(
                    (e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                .toList(),
            onChanged: (v) {
              _status = v!;
              _load();
            }),
        for (final row in vendorRecords(data['bookings']))
          _card('#${row['order_code']} • ${row['customer_name']}',
              '${row['experience_name']}\n${row['booking_date_formatted']} • ${row['time_slot']}\n${row['guests_label']} • ${row['total_price_formatted']}\n${row['status_label']} • ${row['payment_status_label']}',
              trailing: PopupMenuButton<String>(
                  enabled: !_busy,
                  onSelected: (status) async {
                    final yes = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                                title: const Text('Cập nhật trạng thái đơn?'),
                                content: Text('#${row['order_code']}'),
                                actions: [
                                  TextButton(
                                      onPressed: () =>
                                          Navigator.pop(context, false),
                                      child: const Text('Quay lại')),
                                  FilledButton(
                                      onPressed: () =>
                                          Navigator.pop(context, true),
                                      child: const Text('Xác nhận'))
                                ]));
                    if (yes == true) {
                      await _mutate('vendors/bookings/${row['id']}/status/',
                          {'status': status},
                          method: 'PATCH');
                    }
                  },
                  itemBuilder: (_) => const [
                        PopupMenuItem(
                            value: 'confirmed', child: Text('Xác nhận')),
                        PopupMenuItem(
                            value: 'completed', child: Text('Hoàn thành')),
                        PopupMenuItem(
                            value: 'cancelled', child: Text('Hủy đơn'))
                      ])),
        if (vendorRecords(data['bookings']).isEmpty)
          const Text('Không có đơn đặt phù hợp.')
      ];
    }
    if (_tab == 3) {
      return [
        _searchBox(),
        for (final trip in vendorRecords(_data))
          _card('${trip['tour_title']}',
              '${trip['scheduled_date_formatted']} • ${trip['guide_name'] ?? ''}',
              onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                      builder: (_) =>
                          VendorTripChatPage(api: _api, trip: trip)))),
        if (vendorRecords(_data).isEmpty) const Text('Chưa có kênh chuyến đi.')
      ];
    }
    if (_tab == 7) {
      return [
        TextButton(
            onPressed: _busy
                ? null
                : () => _mutate(
                    'cms-chatbot/community/notifications/mark-read/',
                    {'mark_all': true}),
            child: const Text('Đánh dấu đã đọc tất cả')),
        for (final row in vendorRecords(_data))
          _card('${row['title'] ?? 'Thông báo'}',
              '${row['message'] ?? row['content'] ?? ''}',
              onTap: () =>
                  _mutate('cms-chatbot/community/notifications/mark-read/', {
                    'notification_ids': [row['id']]
                  }),
              trailing: IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Ẩn thông báo',
                  onPressed: _busy
                      ? null
                      : () => _mutate(
                          'cms-chatbot/community/notifications/dismiss/',
                          {'notification_id': row['id']}))),
        if (vendorRecords(_data).isEmpty) const Text('Chưa có thông báo.')
      ];
    }
    final tours = vendorRecords(_data is List ? _data : data['results']);
    return [
      FilledButton.icon(
          onPressed: _busy ? null : _createExperience,
          icon: const Icon(Icons.add),
          label: const Text('Tạo trải nghiệm')),
      _searchBox(),
      for (final tour in tours.where((t) => '${t['title']} ${t['description']}'
          .toLowerCase()
          .contains(_search.toLowerCase())))
        ExpansionTile(
            title: Text('${tour['title']}'),
            subtitle: Text('${_money(tour['price'])} • ${tour['status']}'),
            children: [
              Wrap(spacing: 8, children: [
                TextButton(
                    onPressed: _busy
                        ? null
                        : () => _action(
                            'Sửa trải nghiệm',
                            'vendors/tours/${tour['id']}/',
                            const {
                              'title': 'Tên trải nghiệm',
                              'description': 'Mô tả',
                              'price': 'Giá niêm yết (đ)'
                            },
                            initial: {
                              'title': tour['title'],
                              'description': tour['description'],
                              'price': tour['price']
                            },
                            bounds: const {'price': (50000, 999999999)},
                            method: 'PATCH'),
                    child: const Text('Chỉnh sửa')),
                TextButton(
                    onPressed: _busy
                        ? null
                        : () => _mutate(
                            'vendors/tours/${tour['id']}/',
                            {
                              'action': tour['status'] == 'suspended'
                                  ? 'resume'
                                  : 'suspend'
                            },
                            method: 'PATCH'),
                    child: Text(tour['status'] == 'suspended'
                        ? 'Mở bán lại'
                        : 'Tạm ngưng')),
                TextButton(
                    onPressed: _busy
                        ? null
                        : () => _action(
                                'Mở chuyến khởi hành',
                                'vendors/tours/${tour['id']}/schedules/',
                                const {
                                  'departure_date': 'Ngày khởi hành',
                                  'start_time': 'Giờ bắt đầu (HH:mm)',
                                  'end_time': 'Giờ kết thúc (HH:mm)',
                                  'max_capacity': 'Sức chứa'
                                },
                                initial: const {
                                  'start_time': '06:00',
                                  'end_time': '10:30',
                                  'max_capacity': 15
                                },
                                bounds: const {
                                  'max_capacity': (1, 50)
                                }),
                    child: const Text('Mở chuyến mới')),
              ]),
              Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('${tour['description'] ?? ''}')),
              if (vendorRecords(tour['checkpoints']).isNotEmpty)
                vendorRoutePreview(tour),
              for (final cp in vendorRecords(tour['checkpoints']))
                ListTile(
                    leading: const Icon(Icons.location_on_outlined),
                    title: Text('${cp['name'] ?? cp['title'] ?? 'Checkpoint'}'),
                    subtitle: Text(
                        '${cp['lat'] ?? cp['latitude']} • ${cp['lng'] ?? cp['longitude']}')),
              for (final schedule in vendorRecords(tour['schedules']))
                ListTile(
                    onTap: _busy ? null : () => _assignGuide(schedule),
                    title: Text(
                        '${schedule['departure_date']} • ${schedule['time_slot'] ?? ''}'),
                    subtitle: Text(
                        '${schedule['status']} • ${schedule['booked_count'] ?? 0}/${schedule['max_capacity']} chỗ'))
            ]),
      if (tours.isEmpty) const Text('Chưa có trải nghiệm.')
    ];
  }
}

class _GuideForm extends StatefulWidget {
  const _GuideForm();
  @override
  State<_GuideForm> createState() => _GuideFormState();
}

class _GuideFormState extends State<_GuideForm> {
  final _key = GlobalKey<FormState>();
  final _fields = {
    'name': 'Họ tên',
    'email': 'Email',
    'password': 'Mật khẩu',
    'phone': 'Số điện thoại',
    'license_number': 'Số thẻ hướng dẫn viên'
  };
  late final _controllers = {
    for (final key in _fields.keys) key: TextEditingController()
  };
  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
          title: const Text('Cấp tài khoản hướng dẫn viên'),
          content: SizedBox(
              width: 440,
              child: SingleChildScrollView(
                  child: Form(
                      key: _key,
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        for (final e in _fields.entries)
                          TextFormField(
                              key: ValueKey(e.key),
                              hintLocales: const [
                                Locale('vi', 'VN'),
                                Locale('en', 'US')
                              ],
                              controller: _controllers[e.key],
                              obscureText: e.key == 'password',
                              decoration: InputDecoration(labelText: e.value),
                              validator: (v) {
                                if (e.key == 'phone' ||
                                    e.key == 'license_number') {
                                  return null;
                                }
                                if (v == null || v.trim().isEmpty) {
                                  return 'Vui lòng nhập thông tin';
                                }
                                if (e.key == 'email' &&
                                    !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                        .hasMatch(v.trim())) {
                                  return 'Email không hợp lệ';
                                }
                                return null;
                              })
                      ])))),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Hủy')),
            FilledButton(
                onPressed: () {
                  if (_key.currentState!.validate()) {
                    Navigator.pop(context, <String, dynamic>{
                      for (final e in _controllers.entries)
                        e.key: e.value.text.trim()
                    });
                  }
                },
                child: const Text('Tạo tài khoản'))
          ]);
}

class VendorTripChatPage extends StatefulWidget {
  const VendorTripChatPage({super.key, required this.api, required this.trip});
  final VendorRepository api;
  final VendorRecord trip;
  @override
  State<VendorTripChatPage> createState() => _VendorTripChatPageState();
}

class _VendorTripChatPageState extends State<VendorTripChatPage> {
  Timer? _timer;
  final _input = TextEditingController();
  VendorRecord _data = {};
  String? _error;
  String _type = 'text';
  bool _sending = false, _loading = false;
  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _input.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_loading) return;
    _loading = true;
    try {
      final data = await widget.api.request('vendors/inbox/messages/', query: {
        'tour_id': '${widget.trip['tour_id']}',
        'date': '${widget.trip['scheduled_date']}'
      });
      if (mounted) {
        setState(() {
          _data = vendorRecord(data);
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      _loading = false;
    }
  }

  Future<void> _send() async {
    if (_sending || _input.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.api
          .request('vendors/inbox/messages/', method: 'POST', body: {
        'tour_id': widget.trip['tour_id'],
        'scheduled_date': widget.trip['scheduled_date'],
        'message_type': _type,
        'content': _input.text.trim()
      });
      if (mounted) _input.clear();
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: Text('${widget.trip['tour_title']}')),
      body: SafeArea(
          child: Column(children: [
        if (_error != null)
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ExpansionTile(title: const Text('HDV & Danh sách đoàn'), children: [
          ListTile(
              title: Text(
                  '${vendorRecord(vendorRecord(_data['trip'])['guide'])['name'] ?? ''}'),
              subtitle: Text(
                  '${vendorRecord(vendorRecord(_data['trip'])['guide'])['phone'] ?? ''}')),
          for (final person
              in vendorRecords(vendorRecord(_data['trip'])['customers']))
            ListTile(
                title:
                    Text('${person['name'] ?? person['customer_name'] ?? ''}'),
                subtitle: Text(
                    '${person['order_code'] ?? ''} • ${person['guests_count'] ?? ''} khách • ${person['checkin_status'] ?? ''}'))
        ]),
        Expanded(
            child: ListView(children: [
          for (final message in vendorRecords(_data['messages']))
            Card(
                color: message['message_type'] == 'bql_alert'
                    ? Colors.red.shade50
                    : message['message_type'] == 'guide_note'
                        ? Colors.green.shade50
                        : null,
                child: ListTile(
                    title: Text('${message['content'] ?? ''}'),
                    subtitle: Text(
                        '${message['sender_name'] ?? ''} • ${message['time_formatted'] ?? ''}')))
        ])),
        Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: DropdownButton<String>(
                value: _type,
                isExpanded: true,
                items: const [
                  DropdownMenuItem(
                      value: 'text', child: Text('Tin nhắn khách')),
                  DropdownMenuItem(
                      value: 'guide_note', child: Text('Ghi chú HDV')),
                  DropdownMenuItem(
                      value: 'bql_alert', child: Text('Cảnh báo an toàn'))
                ],
                onChanged: (v) => setState(() => _type = v!))),
        Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(
                  child: TextField(
                      hintLocales: const [
                    Locale('vi', 'VN'),
                    Locale('en', 'US')
                  ],
                      controller: _input,
                      decoration:
                          const InputDecoration(hintText: 'Nhập tin nhắn…'))),
              IconButton(
                  onPressed: _sending ? null : _send,
                  icon: const Icon(Icons.send))
            ]))
      ])));
}
