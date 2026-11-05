import 'package:flutter/material.dart';

import '../data/profile_repository.dart';

class ProfileHistoryPage extends StatelessWidget {
  const ProfileHistoryPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Lịch sử chuyến đi')),
        body: FutureBuilder<List<Map<String, dynamic>>>(
          future: const ProfileRepository().getBookings(),
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final items = snapshot.data!;
            if (items.isEmpty) {
              return const Center(child: Text('Chưa có chuyến đi nào.'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (_, index) {
                final item = items[index];
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.terrain)),
                    title: Text(
                        '${item['tour_title'] ?? item['experience_name'] ?? 'Tour trekking'}'),
                    subtitle: Text(
                        '${item['booking_date'] ?? ''}\n${item['status_label'] ?? item['status'] ?? ''}'),
                    isThreeLine: true,
                    trailing: Text('${item['total_price_formatted'] ?? ''}'),
                  ),
                );
              },
            );
          },
        ),
      );
}
