import 'package:flutter/material.dart';

class DashboardBottomNavigation extends StatelessWidget {
  const DashboardBottomNavigation(
      {super.key, required this.selectedIndex, required this.onChanged});

  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: onChanged,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF4E7567),
        unselectedItemColor: const Color(0xFF718078),
        selectedFontSize: 9,
        unselectedFontSize: 9,
        elevation: 10,
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.home_rounded, size: 19), label: 'Trang chủ'),
          BottomNavigationBarItem(
              icon: Icon(Icons.explore_outlined, size: 19), label: 'Khám phá'),
          BottomNavigationBarItem(
              icon: Icon(Icons.check_circle_outline_rounded, size: 19),
              label: 'Nhiệm vụ'),
          BottomNavigationBarItem(
              icon: Icon(Icons.card_giftcard_outlined, size: 19),
              label: 'Đổi thưởng'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded, size: 19),
              label: 'Hồ sơ'),
        ],
      );
}
