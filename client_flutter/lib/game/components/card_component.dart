import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../rendering/card_painter.dart';

class FlameCardComponent extends PositionComponent
    with DragCallbacks, TapCallbacks {
  final PlayingCard card;
  final VoidCallback? onTap;
  final void Function(Vector2 globalPos)? onDrop;

  bool isSelected = false;
  bool isDragging = false;
  Vector2? _originalPos;
  double targetAngle = 0.0;

  FlameCardComponent({
    required this.card,
    required Vector2 position,
    required Vector2 size,
    this.targetAngle = 0.0,
    this.onTap,
    this.onDrop,
  }) : super(
          position: position,
          size: size,
          anchor: Anchor.center,
        ) {
    angle = targetAngle;
    _originalPos = position.clone();
  }

  void updateTarget({required Vector2 newPos, required double newAngle, int? zPriority}) {
    position = newPos;
    angle = newAngle;
    targetAngle = newAngle;
    _originalPos = newPos.clone();
    if (zPriority != null) {
      priority = zPriority;
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    // Dynamic shadow when dragged or elevated
    if (isDragging || isSelected) {
      final shadowRRect = RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 8, size.x, size.y),
        const Radius.circular(8.0),
      );
      final shadowPaint = Paint()
        ..color = Colors.black.withValues(alpha: 0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
      canvas.drawRRect(shadowRRect, shadowPaint);
    }

    final painter = CardPainter(
      card: card,
      isSelected: isSelected,
      borderColor: isSelected
          ? const Color(0xFF00E5FF)
          : const Color(0xFFD4AF37),
    );

    painter.paint(canvas, Size(size.x, size.y));
  }

  @override
  void onTapDown(TapDownEvent event) {
    isSelected = !isSelected;
    onTap?.call();
  }

  @override
  void onDragStart(DragStartEvent event) {
    super.onDragStart(event);
    isDragging = true;
    priority = 1000; // Bring to front while dragging
  }

  @override
  void onDragUpdate(DragUpdateEvent event) {
    position += event.localDelta;
    // Dynamic tilt based on horizontal drag velocity
    final tilt = (event.localDelta.x * 0.03).clamp(-0.25, 0.25);
    angle = tilt;
  }

  @override
  void onDragEnd(DragEndEvent event) {
    super.onDragEnd(event);
    isDragging = false;
    angle = targetAngle;
    priority = 10;
    onDrop?.call(position);
  }

  @override
  void onDragCancel(DragCancelEvent event) {
    super.onDragCancel(event);
    isDragging = false;
    if (_originalPos != null) {
      position = _originalPos!;
    }
    angle = targetAngle;
    priority = 10;
  }
}
