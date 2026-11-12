import 'package:flutter/material.dart';
import '../../auth/data/services/auth_session.dart';
import '../data/reward_repository.dart';
import '../../dashboard/widgets/bottom_navigation.dart';

class RewardsPage extends StatefulWidget {
  const RewardsPage({super.key, this.onTabChanged});

  final ValueChanged<int>? onTabChanged;

  @override
  State<RewardsPage> createState() => _RewardsPageState();
}

class _RewardsPageState extends State<RewardsPage> {
  static const _ink = Color(0xFF26332D);
  late Future<List<Map<String, dynamic>>> _rewards =
      const RewardRepository().getRewards();
  late Future<Map<String, dynamic>> _stats =
      const RewardRepository().getStats();

  @override
  void initState() {
    super.initState();
    AuthSession.pointsRevision.addListener(_refreshPoints);
  }

  void _refreshPoints() {
    setState(() {
      _stats = const RewardRepository().getStats();
    });
  }

  @override
  void dispose() {
    AuthSession.pointsRevision.removeListener(_refreshPoints);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        title: const Text('Đổi thưởng & Sản phẩm Xanh'),
        backgroundColor: const Color(0xFFF8FAF8),
        foregroundColor: _ink,
        elevation: 0,
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _rewards,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final rewards = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
            children: [
              const Text('Đổi thưởng',
                  style: TextStyle(color: _ink, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              FutureBuilder<Map<String, dynamic>>(
                future: _stats,
                builder: (_, snapshot) => Text(
                  'Số dư: ${snapshot.data?['points'] ?? '--'} RE-Points',
                  style: const TextStyle(
                      color: Color(0xFF4E7567),
                      fontSize: 12,
                      fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                      value: 'reward', label: Text('Đổi phần thưởng')),
                  ButtonSegment(
                      value: 'recycle', label: Text('Sản phẩm Tái chế')),
                ],
                selected: const {'reward'},
                onSelectionChanged: (_) {},
                style: ButtonStyle(
                    textStyle:
                        WidgetStateProperty.all(const TextStyle(fontSize: 10))),
              ),
              const SizedBox(height: 22),
              const Text('Ưu đãi dành cho bạn',
                  style: TextStyle(color: _ink, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              if (rewards.isEmpty)
                const Text('Chưa có phần thưởng khả dụng.')
              else
                ...rewards.map((reward) => _RewardCard(
                      title: '${reward['title'] ?? 'Phần thưởng'}',
                      points: '${reward['points_required'] ?? 0} Points',
                      icon: Icons.card_giftcard_outlined,
                      onTap: () => _showRewardDetails(reward),
                    )),
              const SizedBox(height: 12),
              const Text('Sản phẩm Tái chế',
                  style: TextStyle(color: _ink, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Row(children: const [
                Expanded(
                    child: _ProductCard(name: 'Móc khóa Vọc\nchả vá tái chế')),
                SizedBox(width: 10),
                Expanded(child: _ProductCard(name: 'Trà thảo mộc\nSơn Trà')),
              ]),
            ],
          );
        },
      ),
      bottomNavigationBar: widget.onTabChanged == null
          ? null
          : DashboardBottomNavigation(
              selectedIndex: 3, onChanged: _handleTabChanged),
    );
  }

  void _handleTabChanged(int index) {
    if (index == 3) return;
    Navigator.of(context).pop();
    widget.onTabChanged?.call(index);
  }

  void _showRewardDetails(Map<String, dynamic> reward) {
    final title = '${reward['title'] ?? 'Phần thưởng'}';
    final id = reward['id'];
    final messenger = ScaffoldMessenger.of(context);
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Chi tiết phần thưởng'),
        content: Text('$title\n\n${reward['points_required'] ?? 0} RE-Points'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Đóng')),
          FilledButton(
            onPressed: id is int
                ? () async {
                    try {
                      await const RewardRepository().redeemReward(id);
                      if (dialogContext.mounted) {
                        Navigator.pop(dialogContext);
                        setState(() {
                          _rewards = const RewardRepository().getRewards();
                        });
                        messenger.showSnackBar(const SnackBar(
                            content: Text('Đổi thưởng thành công!')));
                      }
                    } catch (error) {
                      if (dialogContext.mounted) {
                        messenger.showSnackBar(
                            SnackBar(content: Text(error.toString())));
                      }
                    }
                  }
                : null,
            child: const Text('Đổi ngay'),
          ),
        ],
      ),
    );
  }
}

class _RewardCard extends StatelessWidget {
  const _RewardCard(
      {required this.title,
      required this.points,
      required this.icon,
      required this.onTap});

  final String title;
  final String points;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: ListTile(
          onTap: onTap,
          leading: CircleAvatar(
              backgroundColor: const Color(0xFFF3F4EF),
              child: Icon(icon, color: const Color(0xFF718078), size: 18)),
          title: Text(title,
              style:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          subtitle: Text(points,
              style: const TextStyle(
                  color: Color(0xFF4E7567),
                  fontSize: 9,
                  fontWeight: FontWeight.w700)),
          trailing: const Icon(Icons.chevron_right, size: 18),
        ),
      );
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) => Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(children: [
            Container(
              height: 82,
              decoration: BoxDecoration(
                  color: const Color(0xFFF3F4EF),
                  borderRadius: BorderRadius.circular(10)),
              child: const Center(
                  child: Icon(Icons.recycling,
                      color: Color(0xFF4E7567), size: 28)),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(name,
                  style: const TextStyle(
                      color: Color(0xFF26332D),
                      fontSize: 10,
                      fontWeight: FontWeight.w700)),
            ),
          ]),
        ),
      );
}
