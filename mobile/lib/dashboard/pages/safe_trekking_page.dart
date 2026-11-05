import 'package:flutter/material.dart';

import '../../tours/data/tour_repository.dart';
import '../../tours/domain/entities/tour.dart';
import '../../tours/domain/repositories/tour_repository.dart';
import '../../tours/domain/usecases/get_safe_tours_use_case.dart';
import '../../tours/pages/tour_detail_page.dart';

class SafeTrekkingPage extends StatefulWidget {
  const SafeTrekkingPage({super.key, TourRepository? repository})
      : repository = repository ?? const TourRepositoryImpl();

  final TourRepository repository;

  @override
  State<SafeTrekkingPage> createState() => _SafeTrekkingPageState();
}

class _SafeTrekkingPageState extends State<SafeTrekkingPage> {
  static const _ink = Color(0xFF26332D);
  static const _forest = Color(0xFF4E7567);
  static const _muted = Color(0xFF7A8781);
  static const _line = Color(0xFFE1E9E5);
  final _searchController = TextEditingController();
  String _difficulty = 'all';
  late Future<List<Tour>> _tours;

  @override
  void initState() {
    super.initState();
    _tours = _loadTours();
  }

  Future<List<Tour>> _loadTours() => GetSafeToursUseCase(widget.repository)();

  void _reload() => setState(() => _tours = _loadTours());

  List<Tour> _filteredTours(List<Tour> tours) {
    final query = _searchController.text.trim().toLowerCase();
    return tours.where((tour) {
      final matchesDifficulty =
          _difficulty == 'all' || tour.difficulty == _difficulty;
      final matchesSearch = query.isEmpty ||
          tour.title.toLowerCase().contains(query) ||
          tour.description.toLowerCase().contains(query);
      return matchesDifficulty && matchesSearch;
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAF8),
        elevation: 0,
        centerTitle: true,
        title: const Text('Trekking An Toàn',
            style: TextStyle(
                color: _ink, fontSize: 18, fontWeight: FontWeight.w800)),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: _ink, size: 19),
        ),
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: () async => _reload(),
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
                  suffixIcon: IconButton(
                    onPressed: () {
                      _searchController.clear();
                      setState(() {});
                    },
                    icon: Icon(
                      _searchController.text.isEmpty
                          ? Icons.search
                          : Icons.close_rounded,
                      color: _forest,
                    ),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: _line),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _filters(),
              const SizedBox(height: 12),
              FutureBuilder<List<Tour>>(
                future: _tours,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                        padding: EdgeInsets.only(top: 48),
                        child: Center(child: CircularProgressIndicator()));
                  }
                  if (snapshot.hasError) {
                    return _message(
                        'Không thể tải cung đường. '
                        'Hãy kiểm tra backend và thử lại.',
                        true);
                  }
                  final tours = _filteredTours(
                    snapshot.data ?? const <Tour>[],
                  );
                  if (tours.isEmpty) {
                    return _message('Chưa có cung đường phù hợp.', false);
                  }
                  return Column(
                      children: tours
                          .map((tour) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _TourCard(tour: tour)))
                          .toList());
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filters() => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            ['all', 'Tất cả'],
            ['easy', 'Dễ'],
            ['moderate', 'Trung bình'],
            ['challenging', 'Thử thách'],
          ].map((item) {
            return _DifficultyChip(
              value: item[0],
              label: item[1],
              onSelected: () => setState(() => _difficulty = item[0]),
            );
          }).toList(),
        ),
      );

  Widget _message(String text, bool error) => Padding(
      padding: const EdgeInsets.only(top: 48),
      child: Center(
          child: Column(children: [
        Icon(error ? Icons.cloud_off : Icons.terrain_outlined,
            color: _muted, size: 32),
        const SizedBox(height: 8),
        Text(text,
            textAlign: TextAlign.center, style: const TextStyle(color: _muted)),
        if (error) TextButton(onPressed: _reload, child: const Text('Thử lại')),
      ])));
}

class _DifficultyChip extends StatelessWidget {
  const _DifficultyChip({
    required this.value,
    required this.label,
    required this.onSelected,
  });

  final String value;
  final String label;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    final state = context.findAncestorStateOfType<_SafeTrekkingPageState>()!;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: state._difficulty == value,
        onSelected: (_) => onSelected(),
        selectedColor: const Color(0xFF4E7567),
        backgroundColor: Colors.white,
        side: const BorderSide(color: Color(0xFFE1E9E5)),
        labelStyle: TextStyle(
            color: state._difficulty == value
                ? Colors.white
                : const Color(0xFF26332D),
            fontSize: 10,
            fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _TourCard extends StatelessWidget {
  const _TourCard({required this.tour});
  final Tour tour;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(17),
      onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => TourDetailPage(tour: tour))),
      child: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFE1E9E5)),
            borderRadius: BorderRadius.circular(17)),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: tour.imageUrl.isEmpty
                ? _imageFallback()
                : Image.network(tour.imageUrl,
                    width: 76,
                    height: 76,
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) return child;
                      return _imageFallback(
                        child: const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      );
                    },
                    errorBuilder: (_, __, ___) => _imageFallback()),
          ),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(tour.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Color(0xFF26332D),
                        fontSize: 12,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 5),
                Text(
                    '${tour.distanceKm.toStringAsFixed(1)} km · '
                    '${tour.durationHours.toStringAsFixed(1)} giờ · '
                    '${tour.difficultyLabel}',
                    style: const TextStyle(
                        color: Color(0xFF7A8781), fontSize: 10)),
                const SizedBox(height: 7),
                Row(children: [
                  Text(
                      tour.priceFormatted.isEmpty
                          ? '${tour.price} đ/người'
                          : tour.priceFormatted,
                      style: const TextStyle(
                          color: Color(0xFF26332D),
                          fontSize: 10,
                          fontWeight: FontWeight.w800)),
                  const Spacer(),
                  SizedBox(
                      height: 25,
                      child: FilledButton(
                          onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                  builder: (_) => TourDetailPage(tour: tour))),
                          style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF4E7567),
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              textStyle: const TextStyle(
                                  fontSize: 9, fontWeight: FontWeight.w700),
                              shape: const StadiumBorder()),
                          child: const Text('Chi tiết →'))),
                ]),
              ])),
        ]),
      ),
    );
  }

  Widget _imageFallback({Widget? child}) => Container(
        width: 76,
        height: 76,
        color: const Color(0xFFDCE8E1),
        child: child ??
            const Icon(Icons.landscape_rounded,
                color: Color(0xFF4E7567), size: 30),
      );
}
