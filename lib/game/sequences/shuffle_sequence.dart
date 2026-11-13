import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';

/// Stage 1 Animation: 450ms center-table riffle shuffle & deck cut sequence.
/// Phases:
///   0.00 - 0.30 : Deck splits into left & right half-packets.
///   0.30 - 0.72 : Staggered riffle cascade interleaving cards back to center.
///   0.72 - 1.00 : Final packet cut lift and crisp snap-down before [onComplete].
class RiffleShuffleComponent extends PositionComponent {
  final Vector2 cardSize;
  final double duration;
  final VoidCallback? onComplete;

  double _elapsed = 0.0;
  bool _completed = false;

  RiffleShuffleComponent({
    required Vector2 center,
    required this.cardSize,
    this.duration = 0.45,
    this.onComplete,
  }) : super(
          position: center.clone(),
          size: cardSize.clone(),
          anchor: Anchor.center,
          priority: 600,
        );

  @override
  void update(double dt) {
    super.update(dt);
    if (_completed) return;

    _elapsed += dt;
    if (_elapsed >= duration) {
      _completed = true;
      onComplete?.call();
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);
    final t = (_elapsed / duration).clamp(0.0, 1.0);
    final cx = size.x / 2;
    final cy = size.y / 2;

    if (t < 0.30) {
      // Phase 1: Center-table deck split into left & right halves
      final p = Curves.easeOutCubic.transform(t / 0.30);
      final spread = p * (size.x * 0.68);
      final tilt = p * 0.09;

      _drawHalfStack(
        canvas,
        Offset(cx - spread, cy),
        -tilt,
        layers: 4,
      );
      _drawHalfStack(
        canvas,
        Offset(cx + spread, cy),
        tilt,
        layers: 4,
      );
    } else if (t < 0.72) {
      // Phase 2: Staggered riffle cascade interleaving back to center
      final p = (t - 0.30) / 0.42;
      final baseSpread = (1.0 - Curves.easeInOut.transform(p)) * (size.x * 0.68);
      final baseTilt = (1.0 - p) * 0.09;

      // Remaining outer stacks shrink as cards riffle inward
      final remainingLayers = math.max(1, ((1.0 - p) * 4).ceil());
      if (p < 0.85) {
        _drawHalfStack(
          canvas,
          Offset(cx - baseSpread, cy + 4),
          -baseTilt,
          layers: remainingLayers,
        );
        _drawHalfStack(
          canvas,
          Offset(cx + baseSpread, cy + 4),
          baseTilt,
          layers: remainingLayers,
        );
      }

      // Staggered alternating riffle leaves flying into center bridge
      const riffleCount = 12;
      for (int i = 0; i < riffleCount; i++) {
        final staggerStart = i * 0.055;
        final localP = ((p - staggerStart) / 0.38).clamp(0.0, 1.0);
        if (localP <= 0.0) continue;

        final eased = Curves.easeOutQuad.transform(localP);
        final fromLeft = i.isEven;
        final startX = cx + (fromLeft ? -baseSpread : baseSpread);
        final targetX = cx + (fromLeft ? -1.5 : 1.5) * (1.0 - eased);
        final x = uiLerp(startX, targetX, eased);
        // Parabolic riffle arch lift
        final lift = math.sin(eased * math.pi) * 26.0;
        final y = cy - lift - (i * 0.6);
        final cardAngle = (fromLeft ? -0.14 : 0.14) * (1.0 - eased);

        _drawSingleCardBack(canvas, Offset(x, y), cardAngle);
      }
    } else {
      // Phase 3: Deck cut lift, side shift, and crisp drop-on-top
      final p = (t - 0.72) / 0.28;
      // Bottom half stays centered
      _drawHalfStack(canvas, Offset(cx, cy + 3), 0.0, layers: 4);

      double cutOffsetX = 0.0;
      double cutOffsetY = -6.0;
      double cutAngle = 0.0;

      if (p < 0.45) {
        final upP = Curves.easeOutCubic.transform(p / 0.45);
        cutOffsetX = upP * (size.x * 0.42);
        cutOffsetY = -6.0 - (upP * 22.0);
        cutAngle = upP * 0.06;
      } else {
        final dropP = Curves.easeInCubic.transform((p - 0.45) / 0.55);
        cutOffsetX = (1.0 - dropP) * (size.x * 0.42);
        cutOffsetY = -28.0 + (dropP * 24.0);
        cutAngle = (1.0 - dropP) * 0.06;
      }

      _drawHalfStack(
        canvas,
        Offset(cx + cutOffsetX, cy + cutOffsetY),
        cutAngle,
        layers: 3,
      );
    }
  }

  double uiLerp(double a, double b, double t) => a + (b - a) * t;

  void _drawHalfStack(
    Canvas canvas,
    Offset center,
    double angle, {
    int layers = 3,
  }) {
    for (int i = 0; i < layers; i++) {
      final offset = Offset(center.dx - i * 1.5, center.dy - i * 2.0);
      _drawSingleCardBack(canvas, offset, angle);
    }
  }

  void _drawSingleCardBack(Canvas canvas, Offset center, double angle) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(angle);

    final rect = Rect.fromCenter(
      center: Offset.zero,
      width: size.x,
      height: size.y,
    );
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(9.0));

    // Drop shadow
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.42)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawRRect(rrect.shift(const Offset(2, 4)), shadowPaint);

    // Ivory outer border
    final ivoryPaint = Paint()..color = const Color(0xFFFAF6EE);
    canvas.drawRRect(rrect, ivoryPaint);

    // Deep Cinnabar field
    final fieldRect = rect.deflate(5.0);
    final fieldRRect = RRect.fromRectAndRadius(
      fieldRect,
      const Radius.circular(5.5),
    );
    final fieldPaint = Paint()..color = const Color(0xFF881313);
    canvas.drawRRect(fieldRRect, fieldPaint);

    // Gold filigree border
    final goldStroke = Paint()
      ..color = const Color(0xFFE5C378)
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        fieldRect.deflate(3.5),
        const Radius.circular(3.5),
      ),
      goldStroke,
    );

    // Center dark clasp medallion
    final medallionBg = Paint()..color = const Color(0xFF3B0707);
    canvas.drawCircle(Offset.zero, size.x * 0.16, medallionBg);
    canvas.drawCircle(Offset.zero, size.x * 0.16, goldStroke);

    canvas.restore();
  }
}
