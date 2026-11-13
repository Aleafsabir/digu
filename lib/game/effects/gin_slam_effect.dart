import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';

/// Golden shockwave ripple expanding across table felt upon Gin Slam impact.
class GoldenShockwaveComponent extends PositionComponent {
  final double maxRadius;
  final double duration;
  final double delay;
  final double initialStrokeWidth;
  double _elapsed = 0.0;

  GoldenShockwaveComponent({
    required Vector2 center,
    this.maxRadius = 380.0,
    this.duration = 0.75,
    this.delay = 0.0,
    this.initialStrokeWidth = 6.0,
  }) : super(
          position: center.clone(),
          anchor: Anchor.center,
          priority: 490,
        );

  @override
  void update(double dt) {
    super.update(dt);
    _elapsed += dt;
    if (_elapsed >= delay + duration) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);
    if (_elapsed < delay) return;

    final activeTime = _elapsed - delay;
    final progress = (activeTime / duration).clamp(0.0, 1.0);
    final easedProgress = Curves.easeOutCubic.transform(progress);
    final currentRadius = easedProgress * maxRadius;
    final alpha = (1.0 - progress).clamp(0.0, 1.0);

    // Primary gold ring
    final ringPaint = Paint()
      ..color = const Color(0xFFE5C378).withValues(alpha: alpha * 0.88)
      ..style = PaintingStyle.stroke
      ..strokeWidth =
          (initialStrokeWidth * (1.0 - progress * 0.55)).clamp(1.5, initialStrokeWidth)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    canvas.drawCircle(Offset.zero, currentRadius, ringPaint);

    // Secondary inner white/gold highlight ring
    if (currentRadius > 26) {
      final innerPaint = Paint()
        ..color = const Color(0xFFFFFBEB).withValues(alpha: alpha * 0.65)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;
      canvas.drawCircle(Offset.zero, currentRadius * 0.82, innerPaint);
    }
  }
}

/// Decaying sinusoidal screen shake controller applied to Flame Camera viewfinder.
class CameraShakeComponent extends Component {
  final CameraComponent camera;
  final double duration;
  final double intensity;
  final double frequency;

  late final Vector2 _originalPos;
  double _elapsed = 0.0;

  CameraShakeComponent({
    required this.camera,
    this.duration = 0.50,
    this.intensity = 18.0,
    this.frequency = 26.0,
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

    final progress = (_elapsed / duration).clamp(0.0, 1.0);
    // Exponentially decaying sinusoidal shake
    final decay = math.exp(-4.2 * progress) * (1.0 - progress);
    final omega = 2.0 * math.pi * frequency;
    final offsetX = math.sin(_elapsed * omega) * intensity * decay;
    final offsetY =
        math.cos(_elapsed * omega * 1.37) * (intensity * 0.72) * decay;

    camera.viewfinder.position = _originalPos + Vector2(offsetX, offsetY);
  }

  @override
  void onRemove() {
    camera.viewfinder.position = _originalPos.clone();
    super.onRemove();
  }
}
