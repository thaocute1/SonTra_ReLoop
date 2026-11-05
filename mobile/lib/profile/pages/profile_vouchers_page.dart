import 'package:flutter/material.dart';

import '../data/profile_repository.dart';

class ProfileVouchersPage extends StatelessWidget {
  const ProfileVouchersPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Voucher của tôi')),
        body: FutureBuilder<List<Map<String, dynamic>>>(
          future: const ProfileRepository().getVouchers(),
          builder: (context, snapshot) {
            if (snapshot.hasError)
              return Center(child: Text('${snapshot.error}'));
            if (!snapshot.hasData)
              return const Center(child: CircularProgressIndicator());
            final items = snapshot.data!;
            if (items.isEmpty)
              return const Center(child: Text('Bạn chưa có voucher đã đổi.'));
            return ListView(
              padding: const EdgeInsets.all(16),
              children: items
                  .map((item) => Card(
                        child: ListTile(
                          leading: const Icon(Icons.confirmation_num_outlined),
                          title: Text('${item['title'] ?? 'Voucher'}'),
                          subtitle: Text('Mã: ${item['code'] ?? ''}'),
                          trailing: Text('${item['status'] ?? ''}'),
                        ),
                      ))
                  .toList(),
            );
          },
        ),
      );
}
