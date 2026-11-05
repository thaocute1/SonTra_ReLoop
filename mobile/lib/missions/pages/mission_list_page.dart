import 'package:flutter/material.dart';

import '../data/mission_repository.dart';
import '../domain/entities/mission.dart';
import '../domain/usecases/get_missions_use_case.dart';
import '../../community/pages/community_page.dart';
import '../../dashboard/widgets/bottom_navigation.dart';
import 'mission_verify_page.dart';

class MissionListPage extends StatefulWidget {
  const MissionListPage(
      {super.key, MissionRepositoryImpl? repository, this.onTabChanged})
      : repository = repository ?? const MissionRepositoryImpl();

  final MissionRepositoryImpl repository;
  final ValueChanged<int>? onTabChanged;

  @override
  State<MissionListPage> createState() => _MissionListPageState();
}

class _MissionListPageState extends State<MissionListPage> {
  late Future<List<Mission>> _missions;

  @override
  void initState() {
    super.initState();
    _missions = GetMissionsUseCase(widget.repository)();
  }

  void _reload() =>
      setState(() => _missions = GetMissionsUseCase(widget.repository)());

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        appBar: AppBar(
          backgroundColor: const Color(0xFF4E7567),
          foregroundColor: Colors.white,
          title: const Text('Hành động nhỏ - Tác động lớn',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          actions: [
            IconButton(
              tooltip: 'Cộng đồng Xanh',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const CommunityPage()),
              ),
              icon: const Icon(Icons.groups_rounded),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async => _reload(),
          child: FutureBuilder<List<Mission>>(
            future: _missions,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _message('Không thể tải nhiệm vụ. Hãy thử lại.');
              }
              final missions = snapshot.data ?? const <Mission>[];
              if (missions.isEmpty) return _message('Chưa có nhiệm vụ mới.');
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                      '${missions.where((item) => item.isCompleted).length}'
                      '/${missions.length} nhiệm vụ đã hoàn thành',
                      style: const TextStyle(color: Color(0xFF6D7D75))),
                  const SizedBox(height: 12),
                  ...missions.map((mission) => _MissionCard(mission: mission)),
                ],
              );
            },
          ),
        ),
        bottomNavigationBar: widget.onTabChanged == null
            ? null
            : DashboardBottomNavigation(
                selectedIndex: 2, onChanged: _handleTabChanged),
      );

  void _handleTabChanged(int index) {
    if (index == 2) return;
    Navigator.of(context).pop();
    widget.onTabChanged?.call(index);
  }

  Widget _message(String message) => Center(
        child: Text(message, style: const TextStyle(color: Color(0xFF708078))),
      );
}

class _MissionCard extends StatelessWidget {
  const _MissionCard({required this.mission});

  final Mission mission;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFE6EFEB),
            child: Icon(mission.isCompleted ? Icons.check : Icons.eco,
                color: const Color(0xFF4E7567)),
          ),
          title: Text(mission.title,
              style: const TextStyle(
                  color: Color(0xFF26332D), fontWeight: FontWeight.w800)),
          subtitle: Text('${mission.description}\n+${mission.points} RE-Points',
              maxLines: 3, overflow: TextOverflow.ellipsis),
          trailing: FilledButton(
            onPressed: mission.isCompleted
                ? null
                : () => Navigator.of(context).push(MaterialPageRoute<void>(
                    builder: (_) => MissionVerifyPage(mission: mission))),
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF4E7567),
                shape: const StadiumBorder()),
            child: Text(mission.isCompleted ? 'Đã xong' : 'Nhiệm vụ này'),
          ),
        ),
      );
}
