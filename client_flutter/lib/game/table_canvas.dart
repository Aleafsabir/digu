import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import '../core/models/card_models.dart';
import '../core/deck/deck_engine.dart';
import '../core/digu/team_solver.dart';
import 'components/card_component.dart';

class DiguGameTable extends FlameGame {
  static const double virtualWidth = 1920.0;
  static const double virtualHeight = 1080.0;

  // Exact card dimensions mirroring the live version (100:148 aspect ratio)
  static final Vector2 handCardSize = Vector2(160.0, 238.0);
  static final Vector2 tableCardSize = Vector2(142.0, 210.0);
  static final Vector2 opponentCardSize = Vector2(110.0, 163.0);

  final List<PlayingCard> currentHand = [];
  final List<FlameCardComponent> handCardComponents = [];

  final List<PlayingCard> stockPile = [];
  final List<FlameCardComponent> stockComponents = [];

  final List<PlayingCard> discardPile = [];
  final List<FlameCardComponent> discardComponents = [];

  final List<FlameCardComponent> opponentCardComponents = [];

  FlameCardComponent? selectedCard;
  late final World gameWorld;

  // Observable state for Flutter HUD overlay
  final ValueNotifier<int> deadwoodPointsNotifier = ValueNotifier<int>(0);
  final ValueNotifier<bool> canGinNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<int> handCountNotifier = ValueNotifier<int>(10);

  @override
  Color backgroundColor() => const Color(0xFF0D0605);

  @override
  Future<void> onLoad() async {
    super.onLoad();

    gameWorld = World();
    add(gameWorld);

    // Fixed virtual resolution camera calibrated for landscape phones & tablets
    camera = CameraComponent.withFixedResolution(
      width: virtualWidth,
      height: virtualHeight,
      world: gameWorld,
    );
    camera.viewfinder.position = Vector2(virtualWidth / 2, virtualHeight / 2);

    // 1. Table Felt Surface with Royal Lacquer Cinnabar Gradient & Watermark
    gameWorld.add(_TableSurfaceComponent(size: Vector2(virtualWidth, virtualHeight)));

    // 2. Initialize and deal standard hand
    dealNewRound();
  }

  void dealNewRound() {
    selectedCard = null;

    // Clean existing components
    for (final c in handCardComponents) {
      c.removeFromParent();
    }
    handCardComponents.clear();

    for (final c in stockComponents) {
      c.removeFromParent();
    }
    stockComponents.clear();

    for (final c in discardComponents) {
      c.removeFromParent();
    }
    discardComponents.clear();

    for (final c in opponentCardComponents) {
      c.removeFromParent();
    }
    opponentCardComponents.clear();

    currentHand.clear();
    stockPile.clear();
    discardPile.clear();

    final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());

    // 1. Deal 10 cards to player
    currentHand.addAll(deck.take(10));

    // 2. Deal 10 cards to opponent (North)
    final opponentHand = deck.skip(10).take(10).toList();

    // 3. Stock pile & initial face-up discard
    stockPile.addAll(deck.skip(20));
    if (stockPile.isNotEmpty) {
      discardPile.add(stockPile.removeLast().copyWith(isFaceDown: false));
    }

    // 4. Render Table
    _layoutOpponentHand(opponentHand);
    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void drawCardFromStock() {
    if (stockPile.isEmpty || currentHand.length >= 11) return;

    final drawn = stockPile.removeLast().copyWith(isFaceDown: false);
    currentHand.add(drawn);

    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void drawCardFromDiscard() {
    if (discardPile.isEmpty || currentHand.length >= 11) return;

    final drawn = discardPile.removeLast();
    currentHand.add(drawn);

    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void discardCard(FlameCardComponent cardComp) {
    final idx = handCardComponents.indexOf(cardComp);
    if (idx == -1) return;

    handCardComponents.removeAt(idx);
    final card = currentHand.removeAt(idx);
    cardComp.removeFromParent();

    discardPile.add(card.copyWith(isFaceDown: false));
    selectedCard = null;

    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void _recalculateAnalysisAndLayoutHand() {
    // Run backtracking optimizer on current hand
    final analysis = TeamHandOptimizer.optimizeMergedHand(currentHand);
    
    // Safely update notifiers after current frame to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      deadwoodPointsNotifier.value = analysis.debtScore;
      canGinNotifier.value = analysis.debtScore == 0 && currentHand.length == 10;
      handCountNotifier.value = currentHand.length;
    });

    final meldCards = {for (final m in analysis.melds) for (final c in m) c.id: 'MELD'};
    final strandedAces = {
      for (final c in analysis.deadwood)
        if (c.rank == 1) c.id
    };

    final n = currentHand.length;
    if (n == 0) return;

    // Card fan layout parameters replicating GinRummyHand.tsx:
    // Spacing: 72px step with 55% horizontal overlap
    const cardStepX = 72.0;
    final totalWidth = ((n - 1) * cardStepX) + handCardSize.x;
    final startX = (virtualWidth / 2) - (totalWidth / 2) + (handCardSize.x / 2);
    const baseY = virtualHeight - 145.0; // Anchor bottom
    final midIndex = (n - 1) / 2.0;

    // Create components if they don't exist yet
    if (handCardComponents.length != n) {
      for (final c in handCardComponents) {
        c.removeFromParent();
      }
      handCardComponents.clear();

      for (int i = 0; i < n; i++) {
        final card = currentHand[i];
        final comp = FlameCardComponent(
          card: card,
          position: Vector2.zero(),
          size: handCardSize,
          onTap: _handleCardTap,
          onDrop: _handleCardDrop,
        );
        handCardComponents.add(comp);
        gameWorld.add(comp);
      }
    }

    for (int i = 0; i < n; i++) {
      final comp = handCardComponents[i];
      comp.card = currentHand[i];
      comp.isAceStranded = strandedAces.contains(comp.card.id);
      comp.meldType = meldCards[comp.card.id];

      final isCurSelected = selectedCard == comp;

      // Natural Upright Rainbow Arc:
      // Middle cards are highest (lowest y). Outer cards drop down smoothly.
      final distFromMid = (i - midIndex).abs();
      final archDrop = distFromMid * distFromMid * 1.5; // Smooth parabolic curve (~30px drop at ends)
      final y = baseY + archDrop - (isCurSelected ? 38.0 : 0.0);
      final x = startX + (i * cardStepX);

      // Fan rotation angle (-6.75 deg to +6.75 deg)
      // Left cards (i < midIndex) have negative angle -> top tilts LEFT
      // Right cards (i > midIndex) have positive angle -> top tilts RIGHT
      final angleDeg = (i - midIndex) * 1.5;
      final angleRad = angleDeg * (math.pi / 180.0);

      comp.updateRestingLayout(
        newPos: Vector2(x, y),
        newAngle: angleRad,
        newPriority: i + 10,
      );
      comp.setSelected(isCurSelected);
    }
  }

  void _handleCardTap(FlameCardComponent tappedComp) {
    if (selectedCard == tappedComp) {
      // Deselect
      selectedCard = null;
      tappedComp.setSelected(false);
    } else {
      // Select new
      selectedCard?.setSelected(false);
      selectedCard = tappedComp;
      tappedComp.setSelected(true);
    }
    _recalculateAnalysisAndLayoutHand();
  }

  void _handleCardDrop(FlameCardComponent comp, Vector2 dropPos) {
    // If dragged upward into the table area (above the hand zone), trigger discard!
    const discardThresholdY = virtualHeight * 0.68;
    if (dropPos.y < discardThresholdY) {
      discardCard(comp);
    } else {
      // Snap back to fanned resting position
      _recalculateAnalysisAndLayoutHand();
    }
  }

  void _layoutTablePiles() {
    for (final c in stockComponents) {
      c.removeFromParent();
    }
    stockComponents.clear();

    for (final c in discardComponents) {
      c.removeFromParent();
    }
    discardComponents.clear();

    final centerX = virtualWidth / 2;
    final centerY = virtualHeight * 0.42;

    // --- STOCK PILE (LEFT) ---
    final stockX = centerX - 130.0;
    if (stockPile.isNotEmpty) {
      // Stack representation (show 3 offset layers for depth)
      final layers = math.min(stockPile.length, 3);
      for (int i = 0; i < layers; i++) {
        final offset = (i - (layers - 1)) * 2.0;
        final isTop = i == layers - 1;
        final stockComp = FlameCardComponent(
          card: stockPile.last.copyWith(isFaceDown: true),
          position: Vector2(stockX + offset, centerY + offset),
          size: tableCardSize,
          onTap: isTop ? (_) => drawCardFromStock() : null,
        );
        stockComponents.add(stockComp);
        gameWorld.add(stockComp);
      }
    }

    // --- DISCARD PILE (RIGHT) ---
    final discardX = centerX + 130.0;
    if (discardPile.isNotEmpty) {
      // Previous cards underneath with subtle live rotation (-3° and +3°)
      if (discardPile.length > 2) {
        final under2 = FlameCardComponent(
          card: discardPile[discardPile.length - 3],
          position: Vector2(discardX + 2, centerY + 2),
          size: tableCardSize,
          restingAngle: 3.0 * (math.pi / 180.0),
        );
        discardComponents.add(under2);
        gameWorld.add(under2);
      }

      if (discardPile.length > 1) {
        final under1 = FlameCardComponent(
          card: discardPile[discardPile.length - 2],
          position: Vector2(discardX - 2, centerY),
          size: tableCardSize,
          restingAngle: -2.0 * (math.pi / 180.0),
        );
        discardComponents.add(under1);
        gameWorld.add(under1);
      }

      // Top Interactive Discard Card
      final topDiscard = FlameCardComponent(
        card: discardPile.last,
        position: Vector2(discardX, centerY),
        size: tableCardSize,
        onTap: (_) => drawCardFromDiscard(),
      );
      topDiscard.priority = 15;
      discardComponents.add(topDiscard);
      gameWorld.add(topDiscard);
    }
  }

  void _layoutOpponentHand(List<PlayingCard> opponentCards) {
    const oppY = 70.0;
    const oppStepX = 42.0;
    final totalWidth = ((opponentCards.length - 1) * oppStepX) + opponentCardSize.x;
    final startX = (virtualWidth / 2) - (totalWidth / 2) + (opponentCardSize.x / 2);

    for (int i = 0; i < opponentCards.length; i++) {
      final oppCard = FlameCardComponent(
        card: opponentCards[i].copyWith(isFaceDown: true),
        position: Vector2(startX + (i * oppStepX), oppY),
        size: opponentCardSize,
      );
      oppCard.priority = i + 1;
      opponentCardComponents.add(oppCard);
      gameWorld.add(oppCard);
    }
  }
}

class _TableSurfaceComponent extends PositionComponent {
  _TableSurfaceComponent({required Vector2 size}) : super(size: size);

  @override
  void render(Canvas canvas) {
    final rect = Offset.zero & Size(size.x, size.y);

    // 1. Royal Lacquer Cinnabar & Velvet Radial Gradient (from live theme)
    final feltPaint = Paint()
      ..shader = const RadialGradient(
        center: Alignment(0.0, -0.1),
        radius: 0.95,
        colors: [
          Color(0xFF380C10), // Rich Cinnabar Center
          Color(0xFF22070A), // Dark Lacquer Velvet
          Color(0xFF0F0304), // Midnight Rim
        ],
      ).createShader(rect);
    canvas.drawRect(rect, feltPaint);

    // 2. Table Bevel Gold Filigree Inset Frame
    final innerRRect = RRect.fromRectAndRadius(rect.deflate(24), const Radius.circular(20));
    final goldBorderPaint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.3)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(innerRRect, goldBorderPaint);

    final thinGoldBorder = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.15)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(RRect.fromRectAndRadius(rect.deflate(32), const Radius.circular(16)), thinGoldBorder);

    // 3. Central Watermark Logo (The Authentic Thaana "ޑ" Digu Emblem)
    const centerX = DiguGameTable.virtualWidth / 2;
    const centerY = DiguGameTable.virtualHeight * 0.42;

    final watermarkCircle = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.05)
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(const Offset(centerX, centerY), 160, watermarkCircle);

    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'ޑ',
        style: TextStyle(
          color: Color(0x18D4AF37), // 10% opacity Gold
          fontSize: 160,
          fontWeight: FontWeight.w900,
          fontFamily: 'sans-serif',
        ),
      ),
      textDirection: TextDirection.rtl,
    )..layout();
    textPainter.paint(canvas, Offset(centerX - (textPainter.width / 2), centerY - (textPainter.height / 2)));

    // 4. Stock & Discard Pile Placard Labels
    _drawPileLabel(canvas, 'STOCK', centerX - 130.0, centerY - 120.0, const Color(0xFFE5C378));
    _drawPileLabel(canvas, 'DISCARD', centerX + 130.0, centerY - 120.0, const Color(0xFFC84B31));

    // 5. Opponent Header Placard
    _drawOpponentPlacard(canvas, centerX, 150.0);
  }

  void _drawPileLabel(Canvas canvas, String text, double x, double y, Color color) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: color.withValues(alpha: 0.8),
          fontSize: 13,
          fontWeight: FontWeight.w900,
          letterSpacing: 2.0,
          fontFamily: 'monospace',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(x - (textPainter.width / 2), y));
  }

  void _drawOpponentPlacard(Canvas canvas, double x, double y) {
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'NORTH OPPONENT • 10 CARDS',
        style: TextStyle(
          color: Color(0x60F7F0EA),
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
          fontFamily: 'sans-serif',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(x - (textPainter.width / 2), y));
  }
}
