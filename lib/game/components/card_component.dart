import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../rendering/card_painter.dart';

class FlameCardComponent extends PositionComponent
    with DragCallbacks, TapCallbacks {
  PlayingCard card;
  final void Function(FlameCardComponent comp)? onTap;
  final void Function(FlameCardComponent comp, Vector2 currentPos)? onDragMoved;
  final void Function(FlameCardComponent comp, Vector2 globalPos)? onDrop;

  bool isSelected = false;
  bool isDragging = false;
  bool isPlayable = true;
  bool isWinnerHighlight = false;
  bool isDraggable = true;
  bool isAceStranded = false;
  String? meldType;

  Vector2 restingPos;
  double restingAngle;
  int basePriority;

  // Physics state for velocity drag tilt & spring return
  double _dragVelocityX = 0.0;
  bool _isSpringing = false;
  Vector2 _springVelocity = Vector2.zero();
  double _angleVelocity = 0.0;
  double _invalidShakeTimer = 0.0;

  FlameCardComponent({
    required this.card,
    required Vector2 position,
    required Vector2 size,
    this.restingAngle = 0.0,
    this.basePriority = 10,
    this.isPlayable = true,
    this.isWinnerHighlight = false,
    this.isDraggable = true,
    this.onTap,
    this.onDragMoved,
    this.onDrop,
  })  : restingPos = position.clone(),
        super(
          position: position,
          size: size,
          anchor: Anchor.center,
        ) {
    angle = restingAngle;
    priority = basePriority;
  }

  void updateRestingLayout({
    required Vector2 newPos,
    required double newAngle,
    required int newPriority,
    bool animated = true,
  }) {
    restingPos = newPos.clone();
    restingAngle = newAngle;
    basePriority = newPriority;

    if (!isDragging) {
      priority = isSelected ? 200 : newPriority;
      if (animated) {
        _isSpringing = true;
      } else {
        _isSpringing = false;
        position = newPos.clone();
        angle = isSelected ? 0.0 : newAngle;
        scale = Vector2.all(1.0);
      }
    }
  }

  void setSelected(bool selected) {
    isSelected = selected;
    if (isSelected) {
      priority = 200; // Above overlapping cards in hand
      _isSpringing = true;
    } else {
      priority = basePriority;
      _isSpringing = true;
    }
  }

  /// Smoothly springs the card back to its resting hand slot, angle, and scale.
  void springReturnToResting() {
    isDragging = false;
    _dragVelocityX = 0.0;
    priority = isSelected ? 200 : basePriority;
    _isSpringing = true;
  }

  @override
  void update(double dt) {
    super.update(dt);
    final clampedDt = dt.clamp(0.0, 0.05);

    if (_invalidShakeTimer > 0) {
      _invalidShakeTimer = (_invalidShakeTimer - clampedDt).clamp(0.0, 1.0);
      final shakePhase = _invalidShakeTimer * 48.0;
      position.x = restingPos.x +
          (shakePhase.abs() > 0 ? (_invalidShakeTimer * 24.0) * (shakePhase % 2 < 1 ? 1 : -1) : 0.0);
      if (_invalidShakeTimer == 0.0) {
        position = restingPos.clone();
      }
      return;
    }

    if (isDragging) {
      // Smoothly decay velocity tilt when pointer pauses mid-drag
      _dragVelocityX *= (1.0 - (clampedDt * 12.0)).clamp(0.0, 1.0);
      final targetTilt = (_dragVelocityX * 0.025).clamp(-0.28, 0.28);
      angle += (targetTilt - angle) * (clampedDt * 16.0).clamp(0.0, 1.0);
      final targetScale = Vector2.all(1.06);
      scale += (targetScale - scale) * (clampedDt * 14.0).clamp(0.0, 1.0);
      return;
    }

    if (_isSpringing) {
      final targetAngle = isSelected ? 0.0 : restingAngle;
      // Critically damped spring step
      const stiffness = 240.0;
      const damping = 26.0;

      final posDelta = restingPos - position;
      _springVelocity += (posDelta * stiffness - _springVelocity * damping) * clampedDt;
      position += _springVelocity * clampedDt;

      final angleDelta = targetAngle - angle;
      _angleVelocity += (angleDelta * stiffness - _angleVelocity * damping) * clampedDt;
      angle += _angleVelocity * clampedDt;

      final targetScale = Vector2.all(1.0);
      scale += (targetScale - scale) * (clampedDt * 14.0).clamp(0.0, 1.0);

      if (posDelta.length2 < 0.35 &&
          _springVelocity.length2 < 2.0 &&
          angleDelta.abs() < 0.004) {
        position = restingPos.clone();
        angle = targetAngle;
        scale = Vector2.all(1.0);
        _springVelocity = Vector2.zero();
        _angleVelocity = 0.0;
        _isSpringing = false;
      }
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    // Dynamic drop shadow when dragged or elevated
    if (isDragging || isSelected) {
      final shadowRRect = RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 10, size.x, size.y),
        const Radius.circular(10.0),
      );
      final shadowPaint = Paint()
        ..color = Colors.black.withValues(alpha: 0.45)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14);
      canvas.drawRRect(shadowRRect, shadowPaint);
    }

    final painter = CardPainter(
      card: card,
      isSelected: isSelected,
      isPlayable: isPlayable,
      isWinnerHighlight: isWinnerHighlight,
      isAceStranded: isAceStranded,
      meldType: meldType,
    );

    painter.paint(canvas, Size(size.x, size.y));
  }

  @override
  void onTapDown(TapDownEvent event) {
    if (!isPlayable && onTap != null) {
      _invalidShakeTimer = 0.18;
      return;
    }
    onTap?.call(this);
  }

  @override
  void onDragStart(DragStartEvent event) {
    super.onDragStart(event);
    if (!isDraggable || onDrop == null) return;
    if (!isPlayable) {
      _invalidShakeTimer = 0.18;
      return;
    }
    isDragging = true;
    _isSpringing = false;
    _dragVelocityX = 0.0;
    _springVelocity = Vector2.zero();
    priority = 1000; // Bring to absolute front while dragging
  }

  @override
  void onDragUpdate(DragUpdateEvent event) {
    if (!isDragging) return;
    position += event.localDelta;
    _dragVelocityX = (_dragVelocityX * 0.55) + (event.localDelta.x * 0.45);
    onDragMoved?.call(this, position);
  }

  @override
  void onDragEnd(DragEndEvent event) {
    super.onDragEnd(event);
    if (!isDragging) return;
    isDragging = false;
    onDrop?.call(this, position);
  }

  @override
  void onDragCancel(DragCancelEvent event) {
    super.onDragCancel(event);
    if (!isDragging) return;
    springReturnToResting();
  }
}
