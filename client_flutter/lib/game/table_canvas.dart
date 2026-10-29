import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import '../core/models/card_models.dart';
import '../core/deck/deck_engine.dart';
import 'components/card_component.dart';

class DiguGameTable extends FlameGame {
  static const double virtualWidth = 1920.0;
  static const double virtualHeight = 1080.0;

  static final Vector2 cardSize = Vector2(100, 145);

  final List<PlayingCard> currentHand = [];
  final List<FlameCardComponent> handCards = [];
  final List<PlayingCard> stockPile = [];
  final List<PlayingCard> discardPile = [];

  late final World gameWorld;

  @override
  Color backgroundColor() => const Color(0xFF0D1117);

  @override
  Future<void> onLoad() async {
    super.onLoad();

    gameWorld = World();
    add(gameWorld);

    // Fixed virtual resolution camera calibrated for landscape 16:9 / 19.5:9
    camera = CameraComponent.withFixedResolution(
      width: virtualWidth,
      height: virtualHeight,
      world: gameWorld,
    );
    camera.viewfinder.position = Vector2(virtualWidth / 2, virtualHeight / 2);

    // 1. Table Felt Surface
    gameWorld.add(_TableSurfaceComponent(size: Vector2(virtualWidth, virtualHeight)));

    // 2. Initialize and deal standard hand
    dealNewRound();
  }

  void dealNewRound() {
    // Clear previous cards
    for (final cardComp in handCards) {
      cardComp.removeFromParent();
    }
    handCards.clear();
    currentHand.clear();

    final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());

    // Deal 10 cards to resting hand
    currentHand.addAll(deck.take(10));
    stockPile.clear();
    stockPile.addAll(deck.skip(10));

    // Top card to discard pile
    if (stockPile.isNotEmpty) {
      discardPile.add(stockPile.removeLast().copyWith(isFaceDown: false));
    }

    _layoutFannedHand();
    _layoutTablePiles();
  }

  void _layoutTablePiles() {
    final centerX = virtualWidth / 2;
    final centerY = virtualHeight / 2 - 40;

    // Stock Pile (Face Down)
    if (stockPile.isNotEmpty) {
      final stockCard = FlameCardComponent(
        card: stockPile.last.copyWith(isFaceDown: true),
        position: Vector2(centerX - 80, centerY),
        size: cardSize,
      );
      gameWorld.add(stockCard);
    }

    // Discard Pile (Face Up)
    if (discardPile.isNotEmpty) {
      final discardCard = FlameCardComponent(
        card: discardPile.last,
        position: Vector2(centerX + 80, centerY),
        size: cardSize,
      );
      gameWorld.add(discardCard);
    }
  }

  void _layoutFannedHand() {
    final n = currentHand.length;
    if (n == 0) return;

    final centerX = virtualWidth / 2;
    final baseY = virtualHeight - 110;
    const arcRadius = 1400.0;
    const maxSpreadAngle = 0.35; // ~20 degrees total spread

    final angleStep = n > 1 ? maxSpreadAngle / (n - 1) : 0.0;
    final startAngle = -maxSpreadAngle / 2;

    for (int i = 0; i < n; i++) {
      final angle = startAngle + (i * angleStep);
      final x = centerX + (arcRadius * math.sin(angle));
      final y = baseY - (arcRadius * (1 - math.cos(angle)));

      final cardComp = FlameCardComponent(
        card: currentHand[i].copyWith(isFaceDown: false),
        position: Vector2(x, y),
        size: cardSize,
        targetAngle: angle * 0.7,
        onDrop: (pos) => _handleCardDrop(i, pos),
      );

      cardComp.priority = i + 10;
      handCards.add(cardComp);
      gameWorld.add(cardComp);
    }
  }

  void _handleCardDrop(int handIndex, Vector2 dropPos) {
    // If dropped near discard area (center), discard it
    final centerX = virtualWidth / 2;
    final centerY = virtualHeight / 2 - 40;
    final discardZone = Rect.fromCircle(center: Offset(centerX + 80, centerY), radius: 100);

    if (discardZone.contains(Offset(dropPos.x, dropPos.y))) {
      final discarded = currentHand.removeAt(handIndex);
      discardPile.add(discarded);
      dealNewRound();
    } else {
      // Return to fanned layout
      _layoutFannedHand();
    }
  }
}

class _TableSurfaceComponent extends PositionComponent {
  _TableSurfaceComponent({required Vector2 size}) : super(size: size);

  @override
  void render(Canvas canvas) {
    final rect = Offset.zero & Size(size.x, size.y);

    // Deep Maldivian Felt gradient (Royal Tournoi Cinnabar)
    final feltPaint = Paint()
      ..shader = const RadialGradient(
        center: Alignment(0.0, -0.1),
        radius: 0.85,
        colors: [
          Color(0xFF8B1520), // Rich Cinnabar Center
          Color(0xFF56080F), // Dark Velvet Rim
          Color(0xFF2C0407), // Outer Edge
        ],
      ).createShader(rect);
    canvas.drawRect(rect, feltPaint);

    // Inner Gold Felt Inset Line
    final innerRect = rect.deflate(32);
    final innerRRect = RRect.fromRectAndRadius(innerRect, const Radius.circular(24));
    final goldBorderPaint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.35)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(innerRRect, goldBorderPaint);

    // Subtle table center watermark logo (Holhuashi Maldivian Lacquer Emblem)
    final watermarkPaint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    canvas.drawCircle(
      Offset(size.x / 2, size.y / 2 - 40),
      160,
      watermarkPaint,
    );
  }
}
