import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../rendering/card_painter.dart';

/// Parabolic Bezier flying card with optional 3D arrival card flip
/// (scale.x 1.0 -> 0.0 -> 1.0 flipping [isFaceDown] to false at midpoint).
/// Used for Digu/Bondi parabolic dealing, Digu stock/discard draws, and trick plays.
class ParabolicDealCardComponent extends PositionComponent {
  PlayingCard card;
  final Vector2 startPos;
  final Vector2 endPos;
  final Vector2 controlPos;
  final Vector2 startSize;
  final Vector2 endSize;
  final double startAngle;
  final double endAngle;
  final double delay;
  final double flightDuration;
  final double flipDuration;
  final bool flipOnArrival;
  final VoidCallback? onLaunch;
  final VoidCallback? onArrived;

  double _elapsed = 0.0;
  bool _launched = false;
  bool _flippedMidpoint = false;
  bool _finished = false;

  ParabolicDealCardComponent({
    required this.card,
    required this.startPos,
    required this.endPos,
    Vector2? controlPos,
    required Vector2 cardSize,
    Vector2? startSize,
    this.startAngle = 0.0,
    this.endAngle = 0.0,
    this.delay = 0.0,
    this.flightDuration = 0.28,
    this.flipDuration = 0.16,
    this.flipOnArrival = false,
    int priority = 450,
    this.onLaunch,
    this.onArrived,
  })  : startSize = (startSize ?? cardSize).clone(),
        endSize = cardSize.clone(),
        controlPos = controlPos?.clone() ??
            _defaultControlPoint(startPos, endPos),
        super(
          position: startPos.clone(),
          size: (startSize ?? cardSize).clone(),
          angle: startAngle,
          anchor: Anchor.center,
          priority: priority,
        );

  static Vector2 _defaultControlPoint(Vector2 a, Vector2 b) {
    final mid = (a + b) * 0.5;
    final dist = a.distanceTo(b);
    // Lift upward in screen space for an authentic parabolic toss arc
    final arcLift = (dist * 0.26).clamp(45.0, 175.0);
    return Vector2(mid.x, mid.y - arcLift);
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (_finished) return;

    _elapsed += dt;
    if (_elapsed < delay) return;

    if (!_launched) {
      _launched = true;
      onLaunch?.call();
    }

    final activeTime = _elapsed - delay;

    if (activeTime < flightDuration) {
      final t = Curves.easeOutCubic.transform(
        (activeTime / flightDuration).clamp(0.0, 1.0),
      );
      final oneMinusT = 1.0 - t;
      // Quadratic Bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
      position = (startPos * (oneMinusT * oneMinusT)) +
          (controlPos * (2.0 * oneMinusT * t)) +
          (endPos * (t * t));
      size = startSize + ((endSize - startSize) * t);
      angle = startAngle + ((endAngle - startAngle) * t);
      scale = Vector2.all(1.0 + math.sin(t * math.pi) * 0.08);
      return;
    }

    // Lock position/size/angle on arrival
    position = endPos.clone();
    size = endSize.clone();
    angle = endAngle;

    if (!flipOnArrival) {
      _complete();
      return;
    }

    final flipTime = activeTime - flightDuration;
    if (flipTime >= flipDuration) {
      scale = Vector2.all(1.0);
      if (!_flippedMidpoint) {
        _flippedMidpoint = true;
        card = card.copyWith(isFaceDown: false);
      }
      _complete();
      return;
    }

    final half = flipDuration * 0.5;
    if (flipTime < half) {
      final p = Curves.easeInQuad.transform((flipTime / half).clamp(0.0, 1.0));
      scale = Vector2((1.0 - p).clamp(0.02, 1.0), 1.0 + p * 0.05);
    } else {
      if (!_flippedMidpoint) {
        _flippedMidpoint = true;
        card = card.copyWith(isFaceDown: false);
      }
      final p = Curves.easeOutBack.transform(
        ((flipTime - half) / half).clamp(0.0, 1.0),
      );
      scale = Vector2(p.clamp(0.02, 1.0), 1.0 + (1.0 - p) * 0.05);
    }
  }

  void _complete() {
    if (_finished) return;
    _finished = true;
    onArrived?.call();
    removeFromParent();
  }

  @override
  void render(Canvas canvas) {
    if (!_launched) return;
    super.render(canvas);

    // Subtle elevation shadow during flight
    final shadowRRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(2, 8, size.x, size.y),
      const Radius.circular(10.0),
    );
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.36)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawRRect(shadowRRect, shadowPaint);

    CardPainter(card: card).paint(canvas, Size(size.x, size.y));
  }
}

/// Animated multi-card stacked packet component for Dhihaeh 3-pass batch dealing (5 -> 4 -> 4).
/// Flies along a subtle parabolic Bezier arc anti-clockwise across seats (S -> E -> N -> W).
class PacketBundleComponent extends PositionComponent {
  final int cardCount;
  final Vector2 startPos;
  final Vector2 endPos;
  final Vector2 controlPos;
  final double endAngle;
  final double delay;
  final double duration;
  final VoidCallback? onLaunch;
  final void Function()? onComplete;

  double _elapsed = 0.0;
  bool _launched = false;
  bool _completed = false;

  PacketBundleComponent({
    required this.cardCount,
    required this.startPos,
    required this.endPos,
    required Vector2 cardSize,
    Vector2? controlPos,
    this.endAngle = 0.0,
    this.delay = 0.0,
    this.duration = 0.32,
    this.onLaunch,
    this.onComplete,
  })  : controlPos = controlPos?.clone() ??
            Vector2(
              (startPos.x + endPos.x) * 0.5,
              ((startPos.y + endPos.y) * 0.5) - 70.0,
            ),
        super(
          position: startPos.clone(),
          size: cardSize.clone(),
          anchor: Anchor.center,
          priority: 500,
        );

  @override
  void update(double dt) {
    super.update(dt);
    if (_completed) return;

    _elapsed += dt;
    if (_elapsed < delay) return;

    if (!_launched) {
      _launched = true;
      onLaunch?.call();
    }

    final activeTime = _elapsed - delay;
    final t = Curves.easeOutCubic.transform(
      (activeTime / duration).clamp(0.0, 1.0),
    );
    final oneMinusT = 1.0 - t;

    position = (startPos * (oneMinusT * oneMinusT)) +
        (controlPos * (2.0 * oneMinusT * t)) +
        (endPos * (t * t));
    angle = endAngle * t;
    scale = Vector2.all(1.0 + math.sin(t * math.pi) * 0.06);

    if (activeTime >= duration) {
      _completed = true;
      onComplete?.call();
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    if (!_launched) return;
    super.render(canvas);

    // Multi-layered 3D shadow representing stacked physical cards
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.x, size.y),
      const Radius.circular(8.0),
    );

    final shadow1 = Paint()..color = const Color(0xFF200704);
    final shadow2 = Paint()..color = const Color(0xFFE5C378);
    final shadow3 = Paint()..color = const Color(0xFFC84B31);

    canvas.drawRRect(rrect.shift(const Offset(6, 6)), shadow1);
    canvas.drawRRect(rrect.shift(const Offset(4, 4)), shadow3);
    canvas.drawRRect(rrect.shift(const Offset(2, 2)), shadow2);

    // Top card back: Royal Maldivian lacquer
    final topPaint = Paint()..color = const Color(0xFF881313);
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
    final badgeBg = Paint()
      ..color = const Color(0xFF130604).withValues(alpha: 0.95);
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

/// Defines a single seat target for anti-clockwise 3-pass Dhihaeh dealing (S -> E -> N -> W).
class DhihaehDealSeatTarget {
  final int seatIndex;
  final Vector2 position;
  final double angle;

  const DhihaehDealSeatTarget({
    required this.seatIndex,
    required this.position,
    required this.angle,
  });
}
