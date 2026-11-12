import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import '../core/models/card_models.dart';
import '../core/deck/deck_engine.dart';
import '../core/digu/team_solver.dart';
import '../core/digu/rummy_validator.dart';
import '../core/digu/hand_sorter.dart';
import '../core/ai/digu_ai.dart';
import 'components/card_component.dart';
import 'effects/gin_slam_effect.dart';

enum HolhuashiGameMode {
  digu,
  dhihaeh,
  bondi,
}

enum GameTurnPhase {
  awaitDraw,
  awaitAction,
  botThinking,
  roundOver,
}

class RoundOverData {
  final bool humanWon;
  final String winnerName;
  final List<List<PlayingCard>> winningMelds;
  final List<PlayingCard> deadwood;
  final int meldScore;
  final int debtScore;
  final int ginBonus;
  final int netRoundScore;

  const RoundOverData({
    required this.humanWon,
    required this.winnerName,
    required this.winningMelds,
    required this.deadwood,
    required this.meldScore,
    required this.debtScore,
    required this.ginBonus,
    required this.netRoundScore,
  });
}

class DiguGameTable extends FlameGame {
  static const double virtualWidth = 1920.0;
  static const double virtualHeight = 1080.0;

  static final Vector2 handCardSize = Vector2(160.0, 238.0);
  static final Vector2 tableCardSize = Vector2(142.0, 210.0);
  static final Vector2 opponentCardSize = Vector2(110.0, 163.0);

  final List<PlayingCard> currentHand = [];
  final List<FlameCardComponent> handCardComponents = [];

  final List<PlayingCard> botHand = [];
  final List<FlameCardComponent> opponentCardComponents = [];

  final List<PlayingCard> stockPile = [];
  final List<FlameCardComponent> stockComponents = [];

  final List<PlayingCard> discardPile = [];
  final List<FlameCardComponent> discardComponents = [];

  FlameCardComponent? finishSlotCard;
  FlameCardComponent? selectedCard;
  late final World gameWorld;

  GameTurnPhase phase = GameTurnPhase.awaitDraw;
  HandSortMode currentSortMode = HandSortMode.melds;

  // Notifiers for Flutter UI HUD
  final ValueNotifier<int> deadwoodPointsNotifier = ValueNotifier<int>(0);
  final ValueNotifier<bool> canGinNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<int> handCountNotifier = ValueNotifier<int>(10);
  final ValueNotifier<String> statusMessageNotifier =
      ValueNotifier<String>('Your Turn: Draw 1 card from Stock or Discard');
  final ValueNotifier<GameTurnPhase> phaseNotifier =
      ValueNotifier<GameTurnPhase>(GameTurnPhase.awaitDraw);

  void Function(RoundOverData data)? onRoundCompleted;

  @override
  Color backgroundColor() => const Color(0xFF0D0605);

  @override
  Future<void> onLoad() async {
    super.onLoad();

    gameWorld = World();
    add(gameWorld);

    camera = CameraComponent.withFixedResolution(
      width: virtualWidth,
      height: virtualHeight,
      world: gameWorld,
    );
    camera.viewfinder.position = Vector2(virtualWidth / 2, virtualHeight / 2);

    gameWorld.add(_TableSurfaceComponent(size: Vector2(virtualWidth, virtualHeight)));

    dealNewRound();
  }

  void dealNewRound() {
    selectedCard = null;
    phase = GameTurnPhase.awaitDraw;
    phaseNotifier.value = phase;
    statusMessageNotifier.value = 'Your Turn: Draw 1 card from Stock or Discard';

    finishSlotCard?.removeFromParent();
    finishSlotCard = null;

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
    botHand.clear();
    stockPile.clear();
    discardPile.clear();

    final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());

    // 1. Deal 10 cards to Human & 10 to Bot
    currentHand.addAll(deck.take(10));
    botHand.addAll(deck.skip(10).take(10));

    // 2. Setup Stock & initial Discard
    stockPile.addAll(deck.skip(20));
    if (stockPile.isNotEmpty) {
      discardPile.add(stockPile.removeLast().copyWith(isFaceDown: false));
    }

    _sortCurrentHand(currentSortMode);
    _layoutOpponentHand();
    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void sortHand(HandSortMode mode) {
    currentSortMode = mode;
    _sortCurrentHand(mode);
    _recalculateAnalysisAndLayoutHand();
  }

  void _sortCurrentHand(HandSortMode mode) {
    switch (mode) {
      case HandSortMode.melds:
        final sorted = HandSorter.sortByMelds(currentHand);
        currentHand.clear();
        currentHand.addAll(sorted);
        break;
      case HandSortMode.suit:
        final sorted = HandSorter.sortBySuit(currentHand);
        currentHand.clear();
        currentHand.addAll(sorted);
        break;
      case HandSortMode.rank:
        final sorted = HandSorter.sortByRank(currentHand);
        currentHand.clear();
        currentHand.addAll(sorted);
        break;
    }
  }

  void drawCardFromStock() {
    if (phase != GameTurnPhase.awaitDraw) return;
    if (stockPile.isEmpty || currentHand.length >= 11) return;

    final drawn = stockPile.removeLast().copyWith(isFaceDown: false);
    currentHand.add(drawn);

    phase = GameTurnPhase.awaitAction;
    phaseNotifier.value = phase;
    statusMessageNotifier.value = 'Discard 1 card or Declare Gin';

    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void drawCardFromDiscard() {
    if (phase != GameTurnPhase.awaitDraw) return;
    if (discardPile.isEmpty || currentHand.length >= 11) return;

    final drawn = discardPile.removeLast();
    currentHand.add(drawn);

    phase = GameTurnPhase.awaitAction;
    phaseNotifier.value = phase;
    statusMessageNotifier.value = 'Discard 1 card or Declare Gin';

    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();
  }

  void discardSelectedCard() {
    if (selectedCard != null && phase == GameTurnPhase.awaitAction) {
      discardCard(selectedCard!);
    }
  }

  void discardCard(FlameCardComponent cardComp) {
    if (phase != GameTurnPhase.awaitAction) return;

    final idx = handCardComponents.indexOf(cardComp);
    if (idx == -1) return;

    handCardComponents.removeAt(idx);
    final card = currentHand.removeAt(idx);
    cardComp.removeFromParent();

    discardPile.add(card.copyWith(isFaceDown: false));
    selectedCard = null;

    _layoutTablePiles();
    _recalculateAnalysisAndLayoutHand();

    // Pass turn to autonomous bot
    _startBotTurn();
  }

  void declareGinSlam() {
    if (phase != GameTurnPhase.awaitAction) return;

    // Check if player has 11 cards and an 11th finish card to slam
    if (currentHand.length == 11) {
      // Find candidate finish card that leaves 0 deadwood
      PlayingCard? finishCard;
      MergeOptimizationResult? winningOpt;

      for (int i = 0; i < currentHand.length; i++) {
        final candidate = currentHand[i];
        final remaining10 = [
          for (int j = 0; j < currentHand.length; j++)
            if (j != i) currentHand[j]
        ];
        final opt = TeamHandOptimizer.optimizeMergedHand(remaining10);
        if (opt.debtScore == 0 && RummyValidator.isValidGinHand(opt.melds)) {
          finishCard = candidate;
          winningOpt = opt;
          break;
        }
      }

      if (finishCard != null && winningOpt != null) {
        currentHand.remove(finishCard);
        phase = GameTurnPhase.roundOver;
        phaseNotifier.value = phase;

        _slamFinishCard(finishCard);
        _recalculateAnalysisAndLayoutHand();

        onRoundCompleted?.call(RoundOverData(
          humanWon: true,
          winnerName: 'You (Player)',
          winningMelds: winningOpt.melds,
          deadwood: winningOpt.deadwood,
          meldScore: winningOpt.meldScore,
          debtScore: 0,
          ginBonus: 100,
          netRoundScore: winningOpt.meldScore + 100,
        ));
      }
    }
  }

  void _slamFinishCard(PlayingCard card) {
    const centerX = virtualWidth / 2;
    final finishPos = Vector2(centerX, virtualHeight * 0.42);
    final finishComp = FlameCardComponent(
      card: card.copyWith(isFaceDown: true),
      position: finishPos,
      size: tableCardSize,
    );
    finishComp.priority = 500;
    finishComp.scale = Vector2.all(1.28);
    finishSlotCard = finishComp;
    gameWorld.add(finishComp);

    // 1. Golden expanding shockwave ring
    gameWorld.add(GoldenShockwaveComponent(center: finishPos));

    // 2. Viewfinder camera screen shake (0.45s)
    add(CameraShakeComponent(camera: camera, duration: 0.45, intensity: 16.0));
  }

  void _startBotTurn() async {
    phase = GameTurnPhase.botThinking;
    phaseNotifier.value = phase;
    statusMessageNotifier.value = 'North Bot is thinking...';

    // 1. Realistic thinking pause (1.2s)
    await Future.delayed(const Duration(milliseconds: 1200));
    if (phase != GameTurnPhase.botThinking) return;

    // 2. Bot decides to draw from Discard or Stock
    final topDiscard = discardPile.isNotEmpty ? discardPile.last : null;
    final shouldDrawDiscard = DiguAI.shouldDrawDiscard(
      botHand: botHand,
      topDiscard: topDiscard,
    );

    if (shouldDrawDiscard && discardPile.isNotEmpty) {
      final drawn = discardPile.removeLast();
      botHand.add(drawn);
      statusMessageNotifier.value = 'North Bot drew from Discard pile';
    } else if (stockPile.isNotEmpty) {
      final drawn = stockPile.removeLast().copyWith(isFaceDown: true);
      botHand.add(drawn);
      statusMessageNotifier.value = 'North Bot drew from Stock pile';
    }

    _layoutTablePiles();
    _layoutOpponentHand();

    // 3. Second thinking pause before discarding (0.9s)
    await Future.delayed(const Duration(milliseconds: 900));
    if (phase != GameTurnPhase.botThinking) return;

    // 4. Bot evaluates best action
    final botDecision = DiguAI.chooseBestAction(botHand);

    if (botDecision.isGinSlam) {
      botHand.remove(botDecision.cardToDiscard);
      phase = GameTurnPhase.roundOver;
      phaseNotifier.value = phase;
      statusMessageNotifier.value = '⚡ NORTH BOT SLAMMED GIN!';

      _slamFinishCard(botDecision.cardToDiscard);
      _layoutOpponentHand();

      final botOpt = TeamHandOptimizer.optimizeMergedHand(botHand);

      onRoundCompleted?.call(RoundOverData(
        humanWon: false,
        winnerName: 'North Bot',
        winningMelds: botOpt.melds,
        deadwood: botOpt.deadwood,
        meldScore: botOpt.meldScore,
        debtScore: 0,
        ginBonus: 100,
        netRoundScore: botOpt.meldScore + 100,
      ));
    } else {
      botHand.remove(botDecision.cardToDiscard);
      discardPile.add(botDecision.cardToDiscard.copyWith(isFaceDown: false));

      _layoutTablePiles();
      _layoutOpponentHand();

      // Return turn to human
      phase = GameTurnPhase.awaitDraw;
      phaseNotifier.value = phase;
      statusMessageNotifier.value = 'Your Turn: Draw 1 card from Stock or Discard';
    }
  }

  void _recalculateAnalysisAndLayoutHand() {
    final analysis = TeamHandOptimizer.optimizeMergedHand(currentHand);

    // Safely update notifiers after current frame
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

    const cardStepX = 72.0;
    final totalWidth = ((n - 1) * cardStepX) + handCardSize.x;
    final startX = (virtualWidth / 2) - (totalWidth / 2) + (handCardSize.x / 2);
    const baseY = virtualHeight - 145.0;
    final midIndex = (n - 1) / 2.0;

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

      // Natural Upright Rainbow Arc (Highest in middle, outer ends curve down)
      final distFromMid = (i - midIndex).abs();
      final archDrop = distFromMid * distFromMid * 1.5;
      final y = baseY + archDrop - (isCurSelected ? 38.0 : 0.0);
      final x = startX + (i * cardStepX);

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
      selectedCard = null;
      tappedComp.setSelected(false);
    } else {
      selectedCard?.setSelected(false);
      selectedCard = tappedComp;
      tappedComp.setSelected(true);
    }
    _recalculateAnalysisAndLayoutHand();
  }

  void _handleCardDrop(FlameCardComponent comp, Vector2 dropPos) {
    const discardThresholdY = virtualHeight * 0.68;
    if (dropPos.y < discardThresholdY && phase == GameTurnPhase.awaitAction) {
      discardCard(comp);
    } else {
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
      final layers = math.min(stockPile.length, 3);
      for (int i = 0; i < layers; i++) {
        final offset = (i - (layers - 1)) * 2.0;
        final isTop = i == layers - 1;
        final stockComp = FlameCardComponent(
          card: stockPile.last.copyWith(isFaceDown: true),
          position: Vector2(stockX + offset, centerY + offset),
          size: tableCardSize,
          onTap: isTop && phase == GameTurnPhase.awaitDraw ? (_) => drawCardFromStock() : null,
        );
        stockComponents.add(stockComp);
        gameWorld.add(stockComp);
      }
    }

    // --- DISCARD PILE (RIGHT) ---
    final discardX = centerX + 130.0;
    if (discardPile.isNotEmpty) {
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

      final topDiscard = FlameCardComponent(
        card: discardPile.last,
        position: Vector2(discardX, centerY),
        size: tableCardSize,
        onTap: phase == GameTurnPhase.awaitDraw ? (_) => drawCardFromDiscard() : null,
      );
      topDiscard.priority = 15;
      discardComponents.add(topDiscard);
      gameWorld.add(topDiscard);
    }
  }

  void _layoutOpponentHand() {
    for (final c in opponentCardComponents) {
      c.removeFromParent();
    }
    opponentCardComponents.clear();

    const oppY = 70.0;
    const oppStepX = 42.0;
    final n = botHand.length;
    final totalWidth = ((n - 1) * oppStepX) + opponentCardSize.x;
    final startX = (virtualWidth / 2) - (totalWidth / 2) + (opponentCardSize.x / 2);

    for (int i = 0; i < n; i++) {
      final oppCard = FlameCardComponent(
        card: botHand[i].copyWith(isFaceDown: true),
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

    final feltPaint = Paint()
      ..shader = const RadialGradient(
        center: Alignment(0.0, -0.1),
        radius: 0.95,
        colors: [
          Color(0xFF380C10),
          Color(0xFF22070A),
          Color(0xFF0F0304),
        ],
      ).createShader(rect);
    canvas.drawRect(rect, feltPaint);

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
          color: Color(0x18D4AF37),
          fontSize: 160,
          fontWeight: FontWeight.w900,
          fontFamily: 'sans-serif',
        ),
      ),
      textDirection: TextDirection.rtl,
    )..layout();
    textPainter.paint(canvas, Offset(centerX - (textPainter.width / 2), centerY - (textPainter.height / 2)));

    _drawPileLabel(canvas, 'STOCK', centerX - 130.0, centerY - 120.0, const Color(0xFFE5C378));
    _drawPileLabel(canvas, 'DISCARD', centerX + 130.0, centerY - 120.0, const Color(0xFFC84B31));

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
        text: 'NORTH BOT • 10 CARDS',
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
