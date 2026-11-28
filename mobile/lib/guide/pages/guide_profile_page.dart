import 'package:flutter/material.dart';

import '../../auth/data/services/auth_session.dart';

class GuideProfilePage extends StatelessWidget {
  const GuideProfilePage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Thông tin cá nhân')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Center(
              child: CircleAvatar(
                radius: 36,
                child: Icon(Icons.person_outline, size: 40),
              ),
            ),
            const SizedBox(height: 20),
            Card(
              child: Column(
                children: [
                  _ProfileField(
                    icon: Icons.badge_outlined,
                    label: 'Họ và tên',
                    value: AuthSession.userName,
                  ),
                  const Divider(height: 1),
                  _ProfileField(
                    icon: Icons.email_outlined,
                    label: 'Email',
                    value: AuthSession.userEmail,
                  ),
                  const Divider(height: 1),
                  _ProfileField(
                    icon: Icons.phone_outlined,
                    label: 'Số điện thoại',
                    value: AuthSession.userPhone,
                  ),
                  const Divider(height: 1),
                  const _ProfileField(
                    icon: Icons.hiking,
                    label: 'Vai trò',
                    value: 'Hướng dẫn viên',
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({required this.icon, required this.label, this.value});

  final IconData icon;
  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon),
        title: Text(label),
        subtitle: SelectableText(
          value == null || value!.trim().isEmpty ? 'Chưa cập nhật' : value!,
        ),
      );
}
