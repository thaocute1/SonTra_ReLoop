import 'package:flutter/material.dart';

import '../data/repositories/dashboard_repository_impl.dart';
import '../domain/entities/dashboard_summary.dart';
import '../domain/usecases/get_dashboard_use_case.dart';
import 'safe_trekking_page.dart';
import '../../missions/pages/mission_list_page.dart';
import '../../profile/pages/profile_page.dart';
import '../../rewards/pages/rewards_page.dart';
import '../widgets/bottom_navigation.dart';
import '../../rewards/data/reward_repository.dart';
import '../../flash_sales/data/flash_sale_repository.dart';
import '../../flash_sales/domain/entities/flash_sale.dart';
import '../../flash_sales/pages/flash_sale_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, this.userName, this.onLogout});

  final String? userName;
  final VoidCallback? onLogout;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  static const _ink = Color(0xFF26332D);
  static const _forest = Color(0xFF4E7567);
  static const _softForest = Color(0xFFE6EFEB);
  static const _muted = Color(0xFF718078);
  static const _background = Color(0xFFF8FAF8);
  static const _orange = Color(0xFFE47A25);

  int _selectedTab = 0;
  late final Future<Map<String, dynamic>> _stats =
      const RewardRepository().getStats();

  @override
  Widget build(BuildContext context) {
    final summary = GetDashboardUseCase(
      DashboardRepositoryImpl(userName: widget.userName),
    )();

    return FutureBuilder<Map<String, dynamic>>(
      future: _stats,
      builder: (context, snapshot) {
        final points = snapshot.data?['points'];
        final syncedSummary = points is num
            ? DashboardSummary(
                userName: summary.userName,
                completedTrails: summary.completedTrails,
                greenPoints: points.toInt(),
                currentStreak: summary.currentStreak,
                nextTrail: summary.nextTrail,
                recentActivities: summary.recentActivities,
              )
            : DashboardSummary(
                userName: summary.userName,
                completedTrails: summary.completedTrails,
                greenPoints: 0,
                currentStreak: summary.currentStreak,
                nextTrail: summary.nextTrail,
                recentActivities: summary.recentActivities,
              );
        return Scaffold(
          backgroundColor: _background,
          body: IndexedStack(
            index: _selectedTab,
            children: [
              _buildHomeTab(summary, syncedSummary),
              const SafeTrekkingPage(),
              const MissionListPage(),
              const RewardsPage(),
              ProfilePage(
                userName: widget.userName ?? 'Phương Thảo',
                onLogout: widget.onLogout,
              ),
            ],
          ),
          bottomNavigationBar: DashboardBottomNavigation(
            selectedIndex: _selectedTab,
            onChanged: _handleTabChanged,
          ),
        );
      },
    );
  }

  Widget _buildHomeTab(
      DashboardSummary summary, DashboardSummary syncedSummary) {
    return SafeArea(
      child: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _TopBar(summary: syncedSummary, onLogout: widget.onLogout),
                    const SizedBox(height: 18),
                    _Greeting(userName: summary.userName),
                    const SizedBox(height: 14),
                    const _SafetyCard(),
                    const SizedBox(height: 16),
                    _QuickActions(
                      onTrekkingTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const SafeTrekkingPage(),
                        ),
                      ),
                      onMissionTap: () => _handleTabChanged(2),
                    ),
                    const SizedBox(height: 16),
                    _FlashSale(points: syncedSummary.greenPoints),
                  ]),
                ),
              ),
            ],
          ),
          Positioned(
            right: 18,
            bottom: 72,
            child: _ChatButton(onPressed: () => _showChat(context)),
          ),
        ],
      ),
    );
  }

  void _handleTabChanged(int index) {
    if (index < 0 || index > 4 || index == _selectedTab) return;
    setState(() => _selectedTab = index);
  }

  void _showChat(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const Padding(
        padding: EdgeInsets.fromLTRB(24, 22, 24, 30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Trợ lý Sơn Trà',
              style: TextStyle(
                color: _ink,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Xin chào! Mình có thể giúp bạn tìm cung đường và thông tin an toàn.',
              style: TextStyle(color: _muted, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.summary, this.onLogout});

  final DashboardSummary summary;
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Text(
          'Sơn Trà ReLoop',
          style: TextStyle(
            color: _DashboardPageState._ink,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
        const Spacer(),
        const Icon(Icons.more_horiz_rounded, color: _DashboardPageState._muted),
        const SizedBox(width: 8),
        TextButton.icon(
          onPressed: onLogout,
          icon: const Icon(Icons.eco_rounded, size: 14),
          label: Text('${summary.greenPoints} Re-Points'),
          style: TextButton.styleFrom(
            foregroundColor: _DashboardPageState._forest,
            backgroundColor: _DashboardPageState._softForest,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            textStyle:
                const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 19,
          backgroundColor: _DashboardPageState._softForest,
          child: const Icon(Icons.person_rounded,
              color: _DashboardPageState._forest, size: 21),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Xin chào,',
                style:
                    TextStyle(color: _DashboardPageState._muted, fontSize: 10)),
            Text(
              userName,
              style: const TextStyle(
                  color: _DashboardPageState._ink,
                  fontSize: 12,
                  fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ],
    );
  }
}

class _SafetyCard extends StatelessWidget {
  const _SafetyCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 14, 18),
      decoration: BoxDecoration(
          color: _DashboardPageState._forest,
          borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Thời tiết & An toàn – Sơn Trà hôm nay',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      height: 1.25,
                      fontWeight: FontWeight.w800),
                ),
                SizedBox(height: 7),
                Text(
                  'Trời quang, nắng nhẹ. Tuyến Ghềnh Bàng đang mở cửa.',
                  style: TextStyle(
                      color: Colors.white70, fontSize: 11, height: 1.3),
                ),
              ],
            ),
          ),
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white54)),
            child: const Icon(Icons.wb_sunny_outlined,
                color: Colors.white, size: 22),
          ),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({this.onTrekkingTap, this.onMissionTap});

  final VoidCallback? onTrekkingTap;
  final VoidCallback? onMissionTap;

  @override
  Widget build(BuildContext context) {
    const actions = [
      (Icons.show_chart_rounded, 'Trekking An\ntoàn'),
      (Icons.star_border_rounded, 'Nhiệm vụ Xanh'),
      (Icons.card_giftcard_rounded, 'Đổi Phần\nthưởng'),
      (Icons.location_on_outlined, 'Bản đồ GPS'),
    ];

    return GridView.builder(
      itemCount: actions.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 20,
        mainAxisExtent: 106,
      ),
      itemBuilder: (context, index) => _ActionTile(
        icon: actions[index].$1,
        label: actions[index].$2,
        onTap: index == 0
            ? onTrekkingTap
            : index == 1
                ? onMissionTap
                : null,
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _DashboardPageState._softForest,
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 13, 14, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: _DashboardPageState._forest, size: 21),
              ),
              Text(
                label,
                style: const TextStyle(
                    color: _DashboardPageState._ink,
                    fontSize: 12,
                    height: 1.15,
                    fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FlashSale extends StatelessWidget {
  const _FlashSale({required this.points});

  final int points;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: const FlashSaleRepository().getActiveSession(),
      builder: (context, snapshot) {
        final session =
            snapshot.hasData ? FlashSaleSession.fromJson(snapshot.data!) : null;
        return Container(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          decoration: BoxDecoration(
              color: const Color(0xFFFFF1E4),
              borderRadius: BorderRadius.circular(17)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.bolt_rounded,
                      color: _DashboardPageState._orange, size: 20),
                  const SizedBox(width: 5),
                  const Text('Flash Sale hôm nay',
                      style: TextStyle(
                          color: _DashboardPageState._ink,
                          fontSize: 17,
                          fontWeight: FontWeight.w800)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                            builder: (_) => const FlashSalePage())),
                    style: TextButton.styleFrom(
                        foregroundColor: _DashboardPageState._orange,
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    child:
                        const Text('Xem tất cả', style: TextStyle(fontSize: 9)),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                        color: _DashboardPageState._ink,
                        borderRadius: BorderRadius.circular(9)),
                    child: Text(
                        session == null
                            ? 'Đang tải Flash Sale...'
                            : 'Kết thúc sau ${_countdown(session.countdown)}',
                        style: TextStyle(color: Colors.white, fontSize: 9)),
                  ),
                  const Spacer(),
                  Text('$points điểm xanh đang có',
                      style: const TextStyle(
                          color: _DashboardPageState._muted, fontSize: 9)),
                ],
              ),
              const SizedBox(height: 12),
              if (session?.items.isNotEmpty == true)
                Row(
                  children: [
                    for (final item in session!.items.take(2))
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: _SaleItem(
                              title: '-${item.discount}%',
                              subtitle: item.title,
                              onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute<void>(
                                      builder: (_) => const FlashSalePage()))),
                        ),
                      ),
                  ],
                )
              else
                const Text('Chưa có ưu đãi đang diễn ra.',
                    style: TextStyle(color: _DashboardPageState._muted)),
            ],
          ),
        );
      },
    );
  }

  String _countdown(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}

class _SaleItem extends StatelessWidget {
  const _SaleItem({required this.title, required this.subtitle, this.onTap});

  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 78,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFF2D8C0)),
            borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(title,
                  style: const TextStyle(
                      color: _DashboardPageState._orange,
                      fontSize: 13,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(subtitle,
                  style: const TextStyle(
                      color: _DashboardPageState._muted, fontSize: 10)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatButton extends StatelessWidget {
  const _ChatButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        FloatingActionButton(
          heroTag: 'dashboard-chat',
          onPressed: onPressed,
          mini: true,
          backgroundColor: _DashboardPageState._forest,
          foregroundColor: Colors.white,
          child: const Icon(Icons.chat_bubble_rounded, size: 19),
        ),
        Positioned(
          right: -1,
          top: -1,
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
                color: Colors.redAccent,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5)),
          ),
        ),
      ],
    );
  }
}
