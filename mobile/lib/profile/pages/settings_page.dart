import 'package:flutter/material.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool notifications = true;
  bool location = true;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Cài đặt ứng dụng')),
        body: ListView(
          children: [
            SwitchListTile(
                title: const Text('Thông báo nhiệm vụ và Flash Sale'),
                value: notifications,
                onChanged: (value) => setState(() => notifications = value)),
            SwitchListTile(
                title: const Text('Cho phép theo dõi vị trí khi trekking'),
                value: location,
                onChanged: (value) => setState(() => location = value)),
            const ListTile(
                leading: Icon(Icons.info_outline),
                title: Text('Phiên bản'),
                trailing: Text('0.1.0')),
          ],
        ),
      );
}
