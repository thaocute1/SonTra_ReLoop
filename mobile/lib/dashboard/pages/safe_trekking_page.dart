import 'package:flutter/material.dart';

class SafeTrekkingPage extends StatefulWidget {
  const SafeTrekkingPage({super.key});

  @override
  State<SafeTrekkingPage> createState() => _SafeTrekkingPageState();
}

class _SafeTrekkingPageState extends State<SafeTrekkingPage> {
  static const _ink = Color(0xFF26332D);
  static const _forest = Color(0xFF4E7567);
  static const _muted = Color(0xFF7A8781);
  static const _line = Color(0xFFE1E9E5);
  static const _orange = Color(0xFFE47A25);

  final _searchController = TextEditingController();
  String _difficulty = 'Tất cả';

  static const _trails = [
    _Trail(
      title: 'Chinh phục Đỉnh Bàn Cờ',
      distance: '4.2 km',
      duration: '2.5 giờ',
      price: '150.000 đ/người',
      note: 'Đốc cao, cần giày trekking',
      icon: Icons.landscape_rounded,
      color: Color(0xFFB7C9C0),
    ),
    _Trail(
      title: 'Bãi Bắc - Cây Đa Di Sản',
      distance: '3.1 km',
      duration: '1.5 giờ',
      price: '120.000 đ/người',
      note: 'Phù hợp gia đình, có trạm nước',
      icon: Icons.forest_rounded,
      color: Color(0xFF789B7B),
    ),
    _Trail(
      title: 'Mũi Nghê',
      distance: '5.6 km',
      duration: '3.5 giờ',
      price: '180.000 đ/người',
      note: 'Địa hình đá trơn trượt khi mưa',
      icon: Icons.waves_rounded,
      color: Color(0xFF36A6C5),
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();
    final trails = _trails.where((trail) {
      return query.isEmpty || trail.title.toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAF8),
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Trekking An Toàn',
          style:
              TextStyle(color: _ink, fontSize: 18, fontWeight: FontWeight.w800),
        ),
        leading: IconButton(
          tooltip: 'Quay lại',
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: _ink, size: 19),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Tìm tuyến Trekking ...',
                hintStyle: const TextStyle(color: _muted, fontSize: 11),
                prefixIcon:
                    const Icon(Icons.search_rounded, color: _muted, size: 18),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _line),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _line),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['Tất cả', 'Dễ', 'Trung bình', 'Thử thách']
                    .map((item) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(item),
                            selected: _difficulty == item,
                            onSelected: (_) =>
                                setState(() => _difficulty = item),
                            selectedColor: _forest,
                            backgroundColor: Colors.white,
                            side: const BorderSide(color: _line),
                            labelStyle: TextStyle(
                              color: _difficulty == item ? Colors.white : _ink,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(15)),
                          ),
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(height: 12),
            if (trails.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 48),
                child:
                    Center(child: Text('Không tìm thấy cung đường phù hợp.')),
              )
            else
              ...trails.map((trail) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _TrailCard(trail: trail),
                  )),
          ],
        ),
      ),
    );
  }
}

class _TrailCard extends StatelessWidget {
  const _TrailCard({required this.trail});

  final _Trail trail;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(9),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: _SafeTrekkingPageState._line),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Row(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: trail.color,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(trail.icon, color: Colors.white, size: 38),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trail.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: _SafeTrekkingPageState._ink,
                      fontSize: 12,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 5),
                Text(
                  '${trail.distance}   ${trail.duration}',
                  style: const TextStyle(
                      color: _SafeTrekkingPageState._muted, fontSize: 10),
                ),
                const SizedBox(height: 5),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEDDF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(trail.note,
                      style: const TextStyle(
                          color: _SafeTrekkingPageState._orange, fontSize: 9)),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(trail.price,
                        style: const TextStyle(
                            color: _SafeTrekkingPageState._ink,
                            fontSize: 10,
                            fontWeight: FontWeight.w800)),
                    const Spacer(),
                    SizedBox(
                      height: 25,
                      child: FilledButton(
                        onPressed: () => _showDetails(context, trail),
                        style: FilledButton.styleFrom(
                          backgroundColor: _SafeTrekkingPageState._forest,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          textStyle: const TextStyle(
                              fontSize: 9, fontWeight: FontWeight.w700),
                          shape: const StadiumBorder(),
                        ),
                        child: const Text('Chi tiết →'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDetails(BuildContext context, _Trail trail) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(trail.title,
                style: const TextStyle(
                    color: _SafeTrekkingPageState._ink,
                    fontSize: 19,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Text('${trail.distance} · ${trail.duration} · ${trail.price}',
                style: const TextStyle(color: _SafeTrekkingPageState._muted)),
            const SizedBox(height: 10),
            Text(trail.note,
                style: const TextStyle(color: _SafeTrekkingPageState._orange)),
          ],
        ),
      ),
    );
  }
}

class _Trail {
  const _Trail({
    required this.title,
    required this.distance,
    required this.duration,
    required this.price,
    required this.note,
    required this.icon,
    required this.color,
  });

  final String title;
  final String distance;
  final String duration;
  final String price;
  final String note;
  final IconData icon;
  final Color color;
}
