import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';

/// Animated multi-card stacked packet component for Dhihaeh batch dealing (5 or 4 cards).
class PacketBundleComponent extends PositionComponent {
  final int cardCount;
  final Vector2 startPos;
  final Vector2 endPos;
  final double duration;
  final void Function()? onComplete;

  PacketBundleComponent({
    required this.cardCount,
    required this.startPos,
    required this.endPos,
    required Vector2 cardSize,
    this.duration = 0.32,
    this.onComplete,
  }) : super(
          position: startPos.clone(),
          size: cardSize.clone(),
          anchor: Anchor.center,
        );

  @override
  void onLoad() {
    super.onLoad();
    add(
      MoveEffect.to(
        endPos,
        EffectController(
          duration: duration,
          curve: Curves.easeOutCubic,
        ),
        onComplete: () {
          onComplete?.call();
          removeFromParent();
        },
      ),
    );
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    // Multi-layered 3D shadow representing stacked physical cards
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.x, size.y),
      const Radius.circular(8.0),
    );

    // Deep shadow layers
    final shadow1 = Paint()..color = const Color(0xFF200704);
    final shadow2 = Paint()..color = const Color(0xFFE5C378);
    final shadow3 = Paint()..color = const Color(0xFFC84B31);

    canvas.drawRRect(rrect.shift(const Offset(6, 6)), shadow1);
    canvas.drawRRect(rrect.shift(const Offset(4, 4)), shadow3);
    canvas.drawRRect(rrect.shift(const Offset(2, 2)), shadow2);

    // Top card back: Royal Maldivian lacquer
    final topPaint = Paint()..color = const Color(0xFF7A1F11);
    final borderPaint = Paint()
      ..color = const Color(0xFFE5C378)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    canvas.drawRRect(rrect, topPaint);
    canvas.drawRRect(rrect, borderPaint);

    // Center count badge
    final badgeRRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(size.x / 2, size.y / 2),
        width: 72,
        height: 28,
      ),
      const Radius.circular(14),
    );
    final badgeBg = Paint()..color = const Color(0xFF130604).withValues(alpha: 0.95);
    final badgeBorder = Paint()
      ..color = const Color(0xFFE5C378)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    canvas.drawRRect(badgeRRect, badgeBg);
    canvas.drawRRect(badgeRRect, badgeBorder);

    final textPainter = TextPainter(
      text: TextSpan(
        text: '$cardCount Cards',
        style: const TextStyle(
          color: Color(0xFFE5C378),
          fontSize: 12.0,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(
      canvas,
      Offset(
        size.x / 2 - textPainter.width / 2,
        size.y / 2 - textPainter.height / 2,
      ),
    );
  }
}
