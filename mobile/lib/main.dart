import 'package:flutter/material.dart';

void main() {
  runApp(const SonTraApp());
}

class SonTraApp extends StatelessWidget {
  const SonTraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Son Tra Trail Quest',
      home: Scaffold(
        appBar: AppBar(title: const Text('Son Tra Trail Quest')),
        body: const Center(
          child: Text('Mobile base - san sang dung man hinh theo wireframe'),
        ),
      ),
    );
  }
}
