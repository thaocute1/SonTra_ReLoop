import 'package:flutter/material.dart';
import '../../auth/pages/login.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _controller = PageController();

  static const _pages = [
    _OnboardingData(
      title: 'Khám Phá Sơn Trà Có\nTrách Nhiệm',
      description: 'Trekking an toàn - Tích điểm xanh - Bảo tồn thiên nhiên',
      kind: _IllustrationKind.explore,
    ),
    _OnboardingData(
      title: 'Lên Kế Hoạch Chuyến Đi\nCủa Bạn',
      description:
          'Tìm hiểu lộ trình, chuẩn bị trang thiết bị và\nđảm bảo an toàn.',
      kind: _IllustrationKind.plan,
    ),
    _OnboardingData(
      title: 'Tích Điểm Xanh & Bảo Tồn\nThiên Nhiên',
      description:
          'Tham gia các hoạt động làm sạch và đóng\ngóp vào nỗ lực bảo vệ rừng Sơn Trà.',
      kind: _IllustrationKind.protect,
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const LoginPage()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9F8F4),
      body: SafeArea(
        child: PageView.builder(
          controller: _controller,
          itemCount: _pages.length,
          itemBuilder: (context, index) => _OnboardingPage(
            data: _pages[index],
            page: index,
            onNext: () => _next(context),
          ),
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({
    required this.data,
    required this.page,
    required this.onNext,
  });

  final _OnboardingData data;
  final int page;
  final VoidCallback onNext;

  static const _ink = Color(0xFF2D3732);
  static const _muted = Color(0xFF6B7A72);
  static const _forest = Color(0xFF4A6B5D);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 22),
      child: Column(
        children: [
          Expanded(
            flex: 5,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(top: 18),
                child: CustomPaint(
                  size: const Size(double.infinity, double.infinity),
                  painter: _OnboardingPainter(data.kind),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            data.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _ink,
              fontSize: 21,
              height: 1.24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            data.description,
            textAlign: TextAlign.center,
            style: const TextStyle(color: _muted, fontSize: 12, height: 1.45),
          ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              3,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                height: 6,
                width: index == page ? 18 : 6,
                decoration: BoxDecoration(
                  color: index == page ? _forest : const Color(0xFFDDE4DF),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 43,
            child: FilledButton(
              onPressed: onNext,
              style: FilledButton.styleFrom(
                backgroundColor: _forest,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                textStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: const Text('Bắt đầu trải nghiệm'),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingData {
  const _OnboardingData({
    required this.title,
    required this.description,
    required this.kind,
  });

  final String title;
  final String description;
  final _IllustrationKind kind;
}

enum _IllustrationKind { explore, plan, protect }

class _OnboardingPainter extends CustomPainter {
  const _OnboardingPainter(this.kind);

  final _IllustrationKind kind;
  static const _forest = Color(0xFF4A6B5D);
  static const _ink = Color(0xFF2D3732);
  static const _orange = Color(0xFFE67E22);

  @override
  void paint(Canvas canvas, Size size) {
    final scale = (size.width / 300).clamp(0.7, 1.15);
    canvas.save();
    canvas.translate(
      (size.width - 300 * scale) / 2,
      (size.height - 225 * scale) / 2,
    );
    canvas.scale(scale);

    final line = Paint()
      ..color = _forest
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final mountain = Path()
      ..moveTo(35, 177)
      ..lineTo(99, 78)
      ..lineTo(132, 119)
      ..lineTo(165, 70)
      ..lineTo(230, 177);
    canvas.drawPath(mountain, line);
    canvas.drawLine(const Offset(35, 177), const Offset(265, 177), line);

    final sun = Paint()
      ..color = _orange
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    canvas.drawCircle(const Offset(196, 67), 11, sun);

    if (kind == _IllustrationKind.explore) {
      _drawExplorer(canvas);
    } else if (kind == _IllustrationKind.plan) {
      _drawPlan(canvas, line);
    } else {
      _drawLeaf(canvas, line);
    }
    canvas.restore();
  }

  void _drawExplorer(Canvas canvas) {
    final marker = Paint()
      ..color = _forest
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    canvas.drawCircle(const Offset(67, 165), 16, marker);
    canvas.drawCircle(
      const Offset(139, 151),
      12,
      Paint()
        ..color = _ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.4,
    );
    canvas.drawLine(const Offset(139, 163), const Offset(139, 188), marker);
    canvas.drawLine(const Offset(139, 174), const Offset(128, 181), marker);
    canvas.drawLine(const Offset(139, 174), const Offset(150, 181), marker);
    canvas.drawLine(const Offset(139, 188), const Offset(132, 199), marker);
    canvas.drawLine(const Offset(139, 188), const Offset(148, 199), marker);
  }

  void _drawPlan(Canvas canvas, Paint line) {
    canvas.drawCircle(const Offset(73, 161), 11, line);
    canvas.drawCircle(const Offset(150, 150), 8, line);
    canvas.drawLine(const Offset(142, 157), const Offset(158, 157), line);
    canvas.drawLine(const Offset(150, 158), const Offset(150, 177), line);
  }

  void _drawLeaf(Canvas canvas, Paint line) {
    final leaf = Path()
      ..moveTo(86, 174)
      ..cubicTo(88, 134, 126, 119, 153, 129)
      ..cubicTo(153, 158, 128, 183, 86, 174);
    canvas.drawPath(leaf, line);
    canvas.drawLine(const Offset(87, 174), const Offset(145, 132), line);
    canvas.drawLine(const Offset(185, 177), const Offset(185, 157), line);
    canvas.drawArc(
      const Rect.fromLTWH(174, 149, 11, 13),
      3.5,
      2.2,
      false,
      line,
    );
    canvas.drawArc(
      const Rect.fromLTWH(185, 149, 11, 13),
      0.6,
      2.2,
      false,
      line,
    );
  }

  @override
  bool shouldRepaint(covariant _OnboardingPainter oldDelegate) =>
      oldDelegate.kind != kind;
}
