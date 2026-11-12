import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../rendering/card_painter.dart';

class FlameCardComponent extends PositionComponent
    with DragCallbacks, TapCallbacks {
  PlayingCard card;
  final void Function(FlameCardComponent comp)? onTap;
  final void Function(FlameCardComponent comp, Vector2 globalPos)? onDrop;

  bool isSelected = false;
  bool isDragging = false;
  bool isAceStranded = false;
  String? meldType;

  Vector2 restingPos;
  double restingAngle;
  int basePriority;

  FlameCardComponent({
    required this.card,
    required Vector2 position,
    required Vector2 size,
    this.restingAngle = 0.0,
    this.basePriority = 10,
    this.onTap,
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
    bool animated = false,
  }) {
    restingPos = newPos.clone();
    restingAngle = newAngle;
    basePriority = newPriority;

    if (!isDragging) {
      position = newPos.clone();
      angle = isSelected ? 0.0 : newAngle;
      priority = isSelected ? 200 : newPriority;
    }
  }

  void setSelected(bool selected) {
    isSelected = selected;
    if (isSelected) {
      priority = 200; // Above overlapping cards in hand
      angle = 0.0;
    } else {
      priority = basePriority;
      angle = restingAngle;
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
      isAceStranded: isAceStranded,
      meldType: meldType,
    );

    painter.paint(canvas, Size(size.x, size.y));
  }

  @override
  void onTapDown(TapDownEvent event) {
    onTap?.call(this);
  }

  @override
  void onDragStart(DragStartEvent event) {
    super.onDragStart(event);
    isDragging = true;
    priority = 1000; // Bring to absolute front while dragging
  }

  @override
  void onDragUpdate(DragUpdateEvent event) {
    position += event.localDelta;
    // Dynamic tilt based on horizontal drag delta
    final tilt = (event.localDelta.x * 0.035).clamp(-0.25, 0.25);
    angle = tilt;
  }

  @override
  void onDragEnd(DragEndEvent event) {
    super.onDragEnd(event);
    isDragging = false;
    onDrop?.call(this, position);
  }

  @override
  void onDragCancel(DragCancelEvent event) {
    super.onDragCancel(event);
    isDragging = false;
    position = restingPos.clone();
    angle = isSelected ? 0.0 : restingAngle;
    priority = isSelected ? 200 : basePriority;
  }
}
