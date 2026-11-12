import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';

/// Golden shockwave ripple expanding across table felt upon Gin Slam impact.
class GoldenShockwaveComponent extends PositionComponent {
  final double maxRadius;
  final double duration;
  double _elapsed = 0.0;

  GoldenShockwaveComponent({
    required Vector2 center,
    this.maxRadius = 380.0,
    this.duration = 0.75,
  }) : super(
          position: center,
          anchor: Anchor.center,
        );

  @override
  void update(double dt) {
    super.update(dt);
    _elapsed += dt;
    if (_elapsed >= duration) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);
    final progress = (_elapsed / duration).clamp(0.0, 1.0);
    final currentRadius = progress * maxRadius;
    final alpha = (1.0 - progress).clamp(0.0, 1.0);

    // Primary gold ring
    final ringPaint = Paint()
      ..color = const Color(0xFFE5C378).withValues(alpha: alpha * 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = (6.0 * (1.0 - progress * 0.5)).clamp(1.5, 6.0)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    canvas.drawCircle(Offset.zero, currentRadius, ringPaint);

    // Secondary inner white/gold highlight ring
    if (currentRadius > 30) {
      final innerPaint = Paint()
        ..color = const Color(0xFFFFFBEB).withValues(alpha: alpha * 0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;
      canvas.drawCircle(Offset.zero, currentRadius * 0.82, innerPaint);
    }
  }
}

/// Screen shake controller applied to Flame Camera viewfinder
class CameraShakeComponent extends Component {
  final CameraComponent camera;
  final double duration;
  final double intensity;

  late final Vector2 _originalPos;
  double _elapsed = 0.0;
  final math.Random _rng = math.Random();

  CameraShakeComponent({
    required this.camera,
    this.duration = 0.45,
    this.intensity = 18.0,
  });

  @override
  void onLoad() {
    super.onLoad();
    _originalPos = camera.viewfinder.position.clone();
  }

  @override
  void update(double dt) {
    super.update(dt);
    _elapsed += dt;

    if (_elapsed >= duration) {
      camera.viewfinder.position = _originalPos.clone();
      removeFromParent();
      return;
    }

    final decay = 1.0 - (_elapsed / duration);
    final offsetX = (_rng.nextDouble() * 2 - 1) * intensity * decay;
    final offsetY = (_rng.nextDouble() * 2 - 1) * intensity * decay;
    camera.viewfinder.position = _originalPos + Vector2(offsetX, offsetY);
  }
}
