import 'package:flutter/material.dart';
import '../../guide/domain/trip.dart';
import '../../guide/pages/trip_map.dart';
import '../domain/vendor_repository.dart';
import 'vendor_action_form.dart';

Widget vendorRoutePreview(VendorRecord tour) {
  final checkpoints = vendorRecords(tour['checkpoints']);
  return TripMap(
      detail: TripDetail({
    'route': {
      'checkpoints': [
        for (final cp in checkpoints)
          {
            ...cp,
            'latitude': cp['lat'] ?? cp['latitude'],
            'longitude': cp['lng'] ?? cp['longitude']
          },
      ]
    }
  }));
}

class VendorRouteEditor extends StatefulWidget {
  const VendorRouteEditor({super.key});
  @override
  State<VendorRouteEditor> createState() => _VendorRouteEditorState();
}

class _VendorRouteEditorState extends State<VendorRouteEditor> {
  final _points = <VendorRecord>[];
  Future<void> _point({int? index}) async {
    final point = await showDialog<VendorRecord>(
        context: context,
        builder: (_) => VendorActionForm(
            title: index == null ? 'Thêm checkpoint GPS' : 'Sửa checkpoint GPS',
            fields: const {
              'name': 'Tên trạm',
              'lat': 'Vĩ độ',
              'lng': 'Kinh độ',
              'radius_tolerance_m': 'Bán kính quét GPS'
            },
            initial: index == null
                ? const {
                    'lat': 16.1042,
                    'lng': 108.2543,
                    'radius_tolerance_m': 30
                  }
                : _points[index],
            bounds: const {'lat': (-85, 85), 'lng': (-180, 180)},
            choices: const {
              'radius_tolerance_m': {
                '20': '20m',
                '30': '30m',
                '50': '50m',
                '100': '100m'
              }
            }));
    if (point != null && mounted) {
      setState(() {
        point['radius_tolerance_m'] =
            int.parse('${point['radius_tolerance_m']}');
        if (index == null) {
          _points.add(point);
        } else {
          _points[index] = point;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Bước 2/3 • Tuyến GPS')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text(
            'Thiết lập các trạm theo thứ tự đi qua. Trạm đầu là điểm xuất phát và trạm cuối là điểm kết thúc.'),
        const SizedBox(height: 12),
        if (_points.isNotEmpty) vendorRoutePreview({'checkpoints': _points}),
        for (final (index, point) in _points.indexed)
          ListTile(
              title: Text(
                  'CP-${(index + 1).toString().padLeft(2, '0')} • ${point['name']}'),
              subtitle: Text(
                  '${point['lat']}, ${point['lng']} • ${point['radius_tolerance_m']}m'),
              onTap: () => _point(index: index),
              trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  tooltip: 'Xóa trạm',
                  onPressed: () => setState(() => _points.removeAt(index)))),
        OutlinedButton.icon(
            onPressed: () => _point(),
            icon: const Icon(Icons.add_location_alt_outlined),
            label: const Text('Thêm checkpoint')),
        FilledButton(
            onPressed: _points.length < 2
                ? null
                : () => Navigator.pop(context, <VendorRecord>[
                      for (final (index, point) in _points.indexed)
                        {...point, 'order_index': index + 1}
                    ]),
            child: const Text('Tiếp tục • Chuyến khởi hành')),
      ]));
}
