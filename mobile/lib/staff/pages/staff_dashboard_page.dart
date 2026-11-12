import 'package:flutter/material.dart';

import '../../auth/data/services/auth_session.dart';

class StaffDashboardPage extends StatelessWidget {
  const StaffDashboardPage({super.key, this.userName, required this.onLogout});

  final String? userName;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    if (!AuthSession.isStaff) {
      return Scaffold(
        body: Center(child: FilledButton(
          onPressed: onLogout, child: const Text('Đăng nhập bằng tài khoản Staff'))),
      );
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        title: const Text('Cổng nhân viên Sơn Trà'),
        backgroundColor: const Color(0xFF315D4D),
        foregroundColor: Colors.white,
        actions: [IconButton(onPressed: onLogout,
          icon: const Icon(Icons.logout), tooltip: 'Đăng xuất')],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.badge_outlined, size: 56, color: Color(0xFF315D4D)),
          const SizedBox(height: 16),
          Text('Xin chào, ${userName ?? AuthSession.userName ?? 'nhân viên BQL'}',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(AuthSession.userEmail ?? ''),
          const SizedBox(height: 8),
          const Text('Vai trò: Nhân viên BQL'),
          const SizedBox(height: 24),
          const Card(child: Padding(
            padding: EdgeInsets.all(20),
            child: Text('Các nghiệp vụ duyệt minh chứng, tiếp nhận rác và xử lý '
              'sự cố hiện nằm trên cổng web Staff. Các màn nghiệp vụ này chưa '
              'được triển khai trên ứng dụng mobile.'),
          )),
        ],
      ),
    );
  }
}
