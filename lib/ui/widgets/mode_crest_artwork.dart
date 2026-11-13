import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../game/table_canvas.dart';

/// Bespoke vector crest artwork rendered inside each Lobby mode pillar card
/// (`DIGU`, `DHIHAEH (10s)`, and `BONDI`), scaling responsively to fill card space.
class ModeCrestArtwork extends StatelessWidget {
  final HolhuashiGameMode mode;
  final bool isSelected;

  const ModeCrestArtwork({
    super.key,
    required this.mode,
    required this.isSelected,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final safeW = constraints.maxWidth.isFinite
            ? math.min(constraints.maxWidth, 210.0)
            : 180.0;
        final safeH = constraints.maxHeight.isFinite
            ? math.min(constraints.maxHeight, 140.0)
            : 120.0;
        final double width = math.max(0.0, math.min(safeW, safeH * 1.5));
        final double height = width / 1.5;

        return AnimatedOpacity(
          duration: const Duration(milliseconds: 180),
          opacity: isSelected ? 1.0 : 0.88,
          child: AnimatedScale(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            scale: isSelected ? 1.05 : 1.0,
            child: SizedBox(
              width: width,
              height: height,
              child: CustomPaint(
                painter: _ModeCrestPainter(
                  mode: mode,
                  isSelected: isSelected,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ModeCrestPainter extends CustomPainter {
  final HolhuashiGameMode mode;
  final bool isSelected;

  const _ModeCrestPainter({
    required this.mode,
    required this.isSelected,
  });

  static const Color _gold = Color(0xFFD4AF37);
  static const Color _goldBright = Color(0xFFE8CA7A);
  static const Color _goldPale = Color(0xFFF6E7BD);
  static const Color _crimson = Color(0xFFA82E1B);
  static const Color _cardRed = Color(0xFFB82424);
  static const Color _ivory = Color(0xFFFCFAF5);
  static const Color _obsidian = Color(0xFF170B0B);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 180.0, size.height / 120.0);

    switch (mode) {
      case HolhuashiGameMode.digu:
        _paintDiguCrest(canvas);
        break;
      case HolhuashiGameMode.dhihaeh:
        _paintDhihaehCrest(canvas);
        break;
      case HolhuashiGameMode.bondi:
        _paintBondiCrest(canvas);
        break;
    }

    canvas.restore();
  }

  void _paintDiguCrest(Canvas canvas) {
    // Outer Maldivian lacquer medallion rings
    canvas.drawCircle(
      const Offset(90, 60),
      52,
      Paint()
        ..color = _gold.withValues(alpha: isSelected ? 0.36 : 0.24)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );
    canvas.drawCircle(
      const Offset(90, 60),
      42,
      Paint()
        ..color = _gold.withValues(alpha: 0.16)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    // Left Card: Q of Spades (-14 deg around (90, 78))
    _drawTiltedCard(
      canvas: canvas,
      pivot: const Offset(90, 78),
      angleDeg: -14,
      rect: const Rect.fromLTWH(44, 20, 46, 68),
      fill: const Color(0xFFF4F4F6),
      stroke: _gold,
      strokeWidth: 1.6,
      cornerLabel: 'Q',
      cornerColor: _obsidian,
      pipPainter: (c) => _drawSpade(c, const Offset(67, 56), 11, _obsidian),
    );

    // Center Card: K of Hearts (upright)
    _drawTiltedCard(
      canvas: canvas,
      pivot: const Offset(90, 78),
      angleDeg: 0,
      rect: const Rect.fromLTWH(67, 14, 46, 68),
      fill: _ivory,
      stroke: _goldBright,
      strokeWidth: 1.8,
      cornerLabel: 'K',
      cornerColor: _cardRed,
      pipPainter: (c) => _drawHeart(c, const Offset(90, 49), 11, _cardRed),
    );

    // Right Card: A of Diamonds (+14 deg, obsidian lacquer surface)
    _drawTiltedCard(
      canvas: canvas,
      pivot: const Offset(90, 78),
      angleDeg: 14,
      rect: const Rect.fromLTWH(90, 20, 46, 68),
      fill: const Color(0xFF200A0D),
      stroke: _gold,
      strokeWidth: 1.8,
      cornerLabel: 'A',
      cornerColor: _goldBright,
      pipPainter: (c) => _drawDiamond(c, const Offset(113, 53.5), 10, _gold),
    );

    // Horizon rule & centerpiece finial dot
    canvas.drawLine(
      const Offset(40, 98),
      const Offset(140, 98),
      Paint()
        ..color = _gold.withValues(alpha: 0.45)
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawCircle(const Offset(90, 98), 4, Paint()..color = _gold);
  }

  void _paintDhihaehCrest(Canvas canvas) {
    // Nested geometric diamond shield
    final outerDiamond = Path()
      ..moveTo(90, 8)
      ..lineTo(144, 60)
      ..lineTo(90, 112)
      ..lineTo(36, 60)
      ..close();
    canvas.drawPath(outerDiamond, Paint()..color = const Color(0xFF1F0A0C));
    canvas.drawPath(
      outerDiamond,
      Paint()
        ..color = _gold.withValues(alpha: 0.42)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );

    final innerDiamond = Path()
      ..moveTo(90, 18)
      ..lineTo(134, 60)
      ..lineTo(90, 102)
      ..lineTo(46, 60)
      ..close();
    canvas.drawPath(
      innerDiamond,
      Paint()
        ..color = _gold.withValues(alpha: 0.22)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    // Left flared 10 card tile (-10 deg)
    _drawTenTile(
      canvas: canvas,
      center: const Offset(53, 64),
      angleDeg: -10,
      textColor: _cardRed,
    );

    // Right flared 10 card tile (+10 deg)
    _drawTenTile(
      canvas: canvas,
      center: const Offset(127, 64),
      angleDeg: 10,
      textColor: _obsidian,
    );

    // Top-centered Crown Seal medallion (sits clear of both "10" numerals)
    canvas.drawCircle(const Offset(90, 48), 19, Paint()..color = const Color(0xFF2D1115));
    canvas.drawCircle(
      const Offset(90, 48),
      19,
      Paint()
        ..color = _goldBright
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0,
    );

    final crown = Path()
      ..moveTo(81, 53)
      ..lineTo(83.5, 44)
      ..lineTo(90, 48.5)
      ..lineTo(96.5, 44)
      ..lineTo(99, 53)
      ..close();
    canvas.drawPath(crown, Paint()..color = _goldBright);
    canvas.drawRect(const Rect.fromLTWH(81, 55.5, 18, 2.5), Paint()..color = _goldBright);
  }

  void _paintBondiCrest(Canvas canvas) {
    // Bold Crimson Lacquer Arena Rings
    canvas.drawCircle(const Offset(90, 60), 48, Paint()..color = const Color(0xFF1B080A));
    canvas.drawCircle(
      const Offset(90, 60),
      48,
      Paint()
        ..color = _crimson.withValues(alpha: 0.65)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8,
    );
    canvas.drawCircle(
      const Offset(90, 60),
      39,
      Paint()
        ..color = _gold.withValues(alpha: 0.30)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    // Back White Ace of Spades tilted -18 deg
    _drawTiltedCard(
      canvas: canvas,
      pivot: const Offset(90, 64),
      angleDeg: -18,
      rect: const Rect.fromLTWH(64, 20, 46, 68),
      fill: _ivory,
      stroke: _gold,
      strokeWidth: 1.5,
      cornerLabel: 'A',
      cornerColor: _obsidian,
      pipPainter: (c) => _drawSpade(c, const Offset(87, 54), 12, _obsidian),
    );

    // Front Bold Crimson Bondi Spade Shield tilted +14 deg
    canvas.save();
    canvas.translate(90, 64);
    canvas.rotate(14 * math.pi / 180.0);
    canvas.translate(-90, -64);
    final frontRRect = RRect.fromRectAndRadius(
      const Rect.fromLTWH(70, 22, 46, 68),
      const Radius.circular(7),
    );
    canvas.drawRRect(frontRRect, Paint()..color = _crimson);
    canvas.drawRRect(
      frontRRect,
      Paint()
        ..color = _goldBright
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );
    _drawSpade(canvas, const Offset(93, 56), 16, _goldPale);
    canvas.restore();
  }

  void _drawTiltedCard({
    required Canvas canvas,
    required Offset pivot,
    required double angleDeg,
    required Rect rect,
    required Color fill,
    required Color stroke,
    required double strokeWidth,
    required String cornerLabel,
    required Color cornerColor,
    required void Function(Canvas) pipPainter,
  }) {
    canvas.save();
    canvas.translate(pivot.dx, pivot.dy);
    canvas.rotate(angleDeg * math.pi / 180.0);
    canvas.translate(-pivot.dx, -pivot.dy);

    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(7));
    canvas.drawRRect(rrect, Paint()..color = fill);
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = stroke
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth,
    );

    final tp = TextPainter(
      text: TextSpan(
        text: cornerLabel,
        style: TextStyle(
          color: cornerColor,
          fontSize: 13,
          fontWeight: FontWeight.w900,
          height: 1.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, Offset(rect.left + 6.5, rect.top + 6));

    pipPainter(canvas);
    canvas.restore();
  }

  void _drawTenTile({
    required Canvas canvas,
    required Offset center,
    required double angleDeg,
    required Color textColor,
  }) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(angleDeg * math.pi / 180.0);
    final rrect = RRect.fromRectAndRadius(
      const Rect.fromLTWH(-19, -22, 38, 44),
      const Radius.circular(6),
    );
    canvas.drawRRect(rrect, Paint()..color = _ivory);
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = _gold
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );

    final tp = TextPainter(
      text: TextSpan(
        text: '10',
        style: TextStyle(
          color: textColor,
          fontSize: 16,
          fontWeight: FontWeight.w900,
          height: 1.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, Offset(-tp.width / 2, -tp.height / 2));
    canvas.restore();
  }

  void _drawSpade(Canvas canvas, Offset center, double radius, Color color) {
    final s = radius;
    final p = Path()
      ..moveTo(center.dx, center.dy - s)
      ..cubicTo(
        center.dx + s * 0.9,
        center.dy - s * 0.25,
        center.dx + s,
        center.dy + s * 0.35,
        center.dx + s * 0.42,
        center.dy + s * 0.55,
      )
      ..quadraticBezierTo(
        center.dx + s * 0.14,
        center.dy + s * 0.58,
        center.dx,
        center.dy + s * 0.32,
      )
      ..quadraticBezierTo(
        center.dx - s * 0.14,
        center.dy + s * 0.58,
        center.dx - s * 0.42,
        center.dy + s * 0.55,
      )
      ..cubicTo(
        center.dx - s,
        center.dy + s * 0.35,
        center.dx - s * 0.9,
        center.dy - s * 0.25,
        center.dx,
        center.dy - s,
      )
      ..close();
    canvas.drawPath(p, Paint()..color = color);

    final stem = Path()
      ..moveTo(center.dx - s * 0.14, center.dy + s * 0.36)
      ..lineTo(center.dx + s * 0.14, center.dy + s * 0.36)
      ..lineTo(center.dx + s * 0.28, center.dy + s * 0.92)
      ..lineTo(center.dx - s * 0.28, center.dy + s * 0.92)
      ..close();
    canvas.drawPath(stem, Paint()..color = color);
  }

  void _drawHeart(Canvas canvas, Offset center, double radius, Color color) {
    final s = radius;
    final p = Path()
      ..moveTo(center.dx, center.dy + s * 0.85)
      ..cubicTo(
        center.dx - s * 1.15,
        center.dy + s * 0.15,
        center.dx - s * 1.0,
        center.dy - s * 0.85,
        center.dx,
        center.dy - s * 0.25,
      )
      ..cubicTo(
        center.dx + s * 1.0,
        center.dy - s * 0.85,
        center.dx + s * 1.15,
        center.dy + s * 0.15,
        center.dx,
        center.dy + s * 0.85,
      )
      ..close();
    canvas.drawPath(p, Paint()..color = color);
  }

  void _drawDiamond(Canvas canvas, Offset center, double radius, Color color) {
    final p = Path()
      ..moveTo(center.dx, center.dy - radius)
      ..lineTo(center.dx + radius * 0.72, center.dy)
      ..lineTo(center.dx, center.dy + radius)
      ..lineTo(center.dx - radius * 0.72, center.dy)
      ..close();
    canvas.drawPath(p, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _ModeCrestPainter oldDelegate) {
    return oldDelegate.mode != mode || oldDelegate.isSelected != isSelected;
  }
}
