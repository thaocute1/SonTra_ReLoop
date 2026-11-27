import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../domain/vendor_repository.dart';

class VendorRevenueChart extends StatefulWidget {
  const VendorRevenueChart({super.key, required this.points});
  final List<VendorRecord> points;

  @override
  State<VendorRevenueChart> createState() => _VendorRevenueChartState();
}

class _VendorRevenueChartState extends State<VendorRevenueChart> {
  String? _selectedDate;
  double _amount(VendorRecord point) =>
      math.max(0, double.tryParse('${point['revenue']}') ?? 0);
  String _money(double value) =>
      '${value.round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
  String _axis(double value) {
    if (value >= 1000000000) {
      return '${(value / 1000000000).toStringAsFixed(1)} tỷ';
    }
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)} tr';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)} nghìn';
    return value.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    final points = widget.points;
    if (points.isEmpty) {
      return const Card(
          child: Padding(
              padding: EdgeInsets.all(28),
              child: Text('Chưa có dữ liệu doanh thu trong kỳ này.')));
    }
    final peak = points.map(_amount).reduce(math.max);
    final maximum = peak > 0 ? peak * 1.15 : 1.0;
    final total = points.fold<double>(0, (sum, p) => sum + _amount(p));
    final selected = points.firstWhere((p) => '${p['date']}' == _selectedDate,
        orElse: () => points.last);
    final color = Theme.of(context).colorScheme.primary;
    return Card(
        child: Padding(
            padding: const EdgeInsets.all(16),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Doanh thu gộp trong kỳ'),
              const SizedBox(height: 4),
              Text(_money(total),
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(color: color, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Semantics(
                  liveRegion: true,
                  child: Text(
                      '${selected['label'] ?? selected['date']}: ${_money(_amount(selected))}',
                      key: const ValueKey('revenue-selection'))),
              const SizedBox(height: 16),
              SizedBox(
                  height: 220,
                  child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                            width: 62,
                            height: 180,
                            child: Column(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  for (final factor in [1.0, .75, .5, .25, 0.0])
                                    Text(
                                        peak == 0
                                            ? (factor == 0 ? '0' : '')
                                            : _axis(maximum * factor),
                                        style: Theme.of(context)
                                            .textTheme
                                            .labelSmall),
                                ])),
                        Expanded(child:
                            LayoutBuilder(builder: (context, constraints) {
                          final width = math.max(
                              constraints.maxWidth, points.length * 48.0);
                          return SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: SizedBox(
                                  width: width,
                                  child: Stack(children: [
                                    for (final factor in [
                                      0.0,
                                      .25,
                                      .5,
                                      .75,
                                      1.0
                                    ])
                                      Positioned(
                                          top: factor * 180,
                                          left: 0,
                                          right: 0,
                                          child: Divider(
                                              height: 1,
                                              color: Colors.grey.shade200)),
                                    Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          for (final point in points)
                                            SizedBox(
                                                width: width / points.length,
                                                child: Semantics(
                                                  button: true,
                                                  selected: identical(
                                                      point, selected),
                                                  label:
                                                      '${point['label'] ?? point['date']}: ${_money(_amount(point))}',
                                                  child: InkWell(
                                                    key: ValueKey(
                                                        'revenue-bar-${point['date']}'),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            6),
                                                    onTap: () => setState(() =>
                                                        _selectedDate =
                                                            '${point['date']}'),
                                                    child: Column(children: [
                                                      SizedBox(
                                                          height: 180,
                                                          child: Align(
                                                              alignment: Alignment
                                                                  .bottomCenter,
                                                              child:
                                                                  AnimatedContainer(
                                                                duration:
                                                                    const Duration(
                                                                        milliseconds:
                                                                            250),
                                                                width: 24,
                                                                height: _amount(
                                                                            point) ==
                                                                        0
                                                                    ? 2
                                                                    : 180 *
                                                                        _amount(
                                                                            point) /
                                                                        maximum,
                                                                decoration: BoxDecoration(
                                                                    color: _amount(point) == 0
                                                                        ? Colors.grey.shade300
                                                                        : identical(point, selected)
                                                                            ? color
                                                                            : color.withValues(alpha: .45),
                                                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(5))),
                                                              ))),
                                                      const SizedBox(height: 8),
                                                      Text(
                                                          '${point['label'] ?? point['date']}',
                                                          maxLines: 1,
                                                          style:
                                                              Theme.of(context)
                                                                  .textTheme
                                                                  .labelSmall),
                                                    ]),
                                                  ),
                                                )),
                                        ]),
                                  ])));
                        })),
                      ])),
              Text(
                  peak == 0
                      ? 'Chưa ghi nhận doanh thu trong kỳ này.'
                      : 'Chạm cột để xem chi tiết • Vuốt ngang để xem thêm',
                  style: Theme.of(context).textTheme.bodySmall),
            ])));
  }
}
