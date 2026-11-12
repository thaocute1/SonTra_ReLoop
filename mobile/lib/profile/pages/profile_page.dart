import 'package:flutter/material.dart';
import '../../auth/data/services/auth_session.dart';
import '../../auth/pages/login.dart';
import '../../dashboard/widgets/bottom_navigation.dart';
import '../../rewards/data/reward_repository.dart';
import 'profile_history_page.dart';
import 'profile_vouchers_page.dart';
import 'settings_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage(
      {super.key,
      this.userName = 'Phương Thảo',
      this.onTabChanged,
      this.onLogout});

  final String userName;
  final ValueChanged<int>? onTabChanged;
  final VoidCallback? onLogout;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  static const _forest = Color(0xFF4E7567);
  static const _ink = Color(0xFF26332D);
  static const _background = Color(0xFFF8FAF8);
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
      backgroundColor: _background,
      appBar: AppBar(
        title: const Text('Hồ sơ & Theo dõi tác động'),
        backgroundColor: _background,
        foregroundColor: _ink,
        elevation: 0,
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _stats,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final stats = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              const CircleAvatar(
                radius: 32,
                backgroundColor: Color(0xFFE6EFEB),
                child: Text('PT',
                    style: TextStyle(
                        color: _forest,
                        fontSize: 20,
                        fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 10),
              Center(
                child: Text(widget.userName,
                    style: const TextStyle(
                        color: _ink,
                        fontSize: 16,
                        fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text('Xanh Enthusiast',
                    style: TextStyle(color: _forest, fontSize: 11)),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  _Stat(
                      value: '${stats['total_km'] ?? 0} km',
                      label: 'Quãng đường\nTrekking'),
                  _Stat(
                      value: '${stats['total_trash_kg'] ?? 0} kg',
                      label: 'Rác đã thu gom'),
                  _Stat(
                      value: '${stats['points'] ?? 0}',
                      label: 'RE-Points tích lũy'),
                ],
              ),
              const SizedBox(height: 20),
              const Text('Bộ sưu tập Huy hiệu',
                  style: TextStyle(color: _ink, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: const [
                  _Badge(icon: Icons.eco_outlined, label: 'Người bảo vệ\nVọc'),
                  _Badge(
                      icon: Icons.terrain_outlined,
                      label: 'Trekker kiên\ncường'),
                  _Badge(icon: Icons.add, label: 'Chưa mở khóa'),
                ],
              ),
              const SizedBox(height: 18),
              _ProfileAction(
                  icon: Icons.history,
                  label: 'Lịch sử chuyến đi',
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                          builder: (_) => const ProfileHistoryPage()))),
              _ProfileAction(
                  icon: Icons.confirmation_num_outlined,
                  label: 'Voucher của tôi',
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                          builder: (_) => const ProfileVouchersPage()))),
              _ProfileAction(
                  icon: Icons.settings_outlined,
                  label: 'Cài đặt ứng dụng',
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                          builder: (_) => const SettingsPage()))),
              _ProfileAction(
                  icon: Icons.logout,
                  label: 'Đăng xuất',
                  color: Colors.deepOrange,
                  onTap: _handleLogout),
            ],
          );
        },
      ),
      bottomNavigationBar: widget.onTabChanged == null
          ? null
          : DashboardBottomNavigation(
              selectedIndex: 4, onChanged: _handleTabChanged),
    );
  }

  void _handleTabChanged(int index) {
    if (index == 4) return;
    Navigator.of(context).pop();
    widget.onTabChanged?.call(index);
  }

  void _handleLogout() {
    AuthSession.clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 3),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
              color: const Color(0xFFE6EFEB),
              borderRadius: BorderRadius.circular(10)),
          child: Column(children: [
            Text(value,
                style: const TextStyle(
                    color: Color(0xFF4E7567),
                    fontSize: 12,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Color(0xFF718078), fontSize: 9, height: 1.2)),
          ]),
        ),
      );
}

class _Badge extends StatelessWidget {
  const _Badge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          CircleAvatar(
              radius: 20,
              backgroundColor: const Color(0xFFE6EFEB),
              child: Icon(icon, color: const Color(0xFF4E7567), size: 20)),
          const SizedBox(height: 5),
          Text(label,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF718078), fontSize: 9)),
        ],
      );
}

class _ProfileAction extends StatelessWidget {
  const _ProfileAction(
      {required this.icon,
      required this.label,
      required this.onTap,
      this.color = const Color(0xFF26332D)});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) => ListTile(
        contentPadding: EdgeInsets.zero,
        dense: true,
        leading: Icon(icon, color: color, size: 17),
        title: Text(label,
            style: TextStyle(
                color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right, size: 17),
        onTap: onTap,
      );
}
