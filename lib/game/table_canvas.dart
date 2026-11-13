import 'dart:async';
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
import '../core/dhihaeh/dhihaeh_engine.dart';
import '../core/dhihaeh/dhihaeh_ai.dart';
import '../core/bondi/bondi_engine.dart';
import 'components/card_component.dart';
import 'effects/gin_slam_effect.dart';
import 'rendering/card_painter.dart';
import 'sequences/deal_sequence.dart';
import 'sequences/shuffle_sequence.dart';

enum HolhuashiGameMode {
  digu,
  dhihaeh,
  bondi,
}

enum GameTurnPhase {
  dealing,
  awaitTrump,
  awaitDraw,
  awaitAction,
  botThinking,
  trickResolving,
  roundOver,
}

/// Compass seat metadata exposed via [DiguGameTable.seatsNotifier].
class SeatInfo {
  final int seatIndex; // 0: South, 1: East, 2: North, 3: West
  final String name;
  final String compassLabel;
  final int cardCount;
  final bool isActiveTurn;
  final bool isPartner;
  final int tricksWon;
  final int capturedTens;

  const SeatInfo({
    required this.seatIndex,
    required this.name,
    required this.compassLabel,
    required this.cardCount,
    required this.isActiveTurn,
    this.isPartner = false,
    this.tricksWon = 0,
    this.capturedTens = 0,
  });
}

/// Captured 10s tally for Dhihaeh (Team 1: South+North vs Team 2: East+West).
class CapturedTensSummary {
  final int team1Count;
  final int team2Count;
  final List<PlayingCard> team1Cards;
  final List<PlayingCard> team2Cards;

  const CapturedTensSummary({
    this.team1Count = 0,
    this.team2Count = 0,
    this.team1Cards = const [],
    this.team2Cards = const [],
  });

  int get total => team1Count + team2Count;
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
  final HolhuashiGameMode mode;
  final String? summaryHeadline;
  final int team1Tens;
  final int team2Tens;
  final int team1Tricks;
  final int team2Tricks;
  final List<PlayingCard> burnedCards;
  final int humanRoundScore;
  final int opponentRoundScore;

  const RoundOverData({
    required this.humanWon,
    required this.winnerName,
    required this.winningMelds,
    required this.deadwood,
    required this.meldScore,
    required this.debtScore,
    required this.ginBonus,
    required this.netRoundScore,
    this.mode = HolhuashiGameMode.digu,
    this.summaryHeadline,
    this.team1Tens = 0,
    this.team2Tens = 0,
    this.team1Tricks = 0,
    this.team2Tricks = 0,
    this.burnedCards = const [],
    this.humanRoundScore = 0,
    this.opponentRoundScore = 0,
  });
}

typedef HolhuashiGameTable = DiguGameTable;

class DiguGameTable extends FlameGame {
  final bool autoDealOnLoad;

  DiguGameTable({this.autoDealOnLoad = true});

  static const double virtualWidth = 1920.0;
  static const double virtualHeight = 1080.0;

  static final Vector2 handCardSize = Vector2(150.0, 210.0);
  static final Vector2 tableCardSize = Vector2(136.0, 190.0);
  static final Vector2 opponentCardSize = Vector2(110.0, 163.0);

  static Vector2 get _tableCenter => Vector2(virtualWidth / 2, virtualHeight * 0.42);
  static Vector2 get _stockPos => Vector2(_tableCenter.x - 140.0, _tableCenter.y);
  static Vector2 get _discardPos => Vector2(_tableCenter.x + 140.0, _tableCenter.y);
  static Vector2 get _ginPortalPos => _tableCenter.clone();
  static Vector2 get _burnPilePos => Vector2(virtualWidth - 190.0, virtualHeight - 170.0);

  // Hand & Pile state
  final List<PlayingCard> currentHand = [];
  final List<FlameCardComponent> handCardComponents = [];

  final List<PlayingCard> botHand = [];
  final List<FlameCardComponent> opponentCardComponents = [];

  // 4-Seat hands for Dhihaeh & Bondi (0: South, 1: East, 2: North, 3: West)
  final List<List<PlayingCard>> _seatHands = List.generate(4, (_) => []);
  final List<List<FlameCardComponent>> _seatOpponentComponents =
      List.generate(4, (_) => []);
  final List<int> _seatTricksWon = [0, 0, 0, 0];
  final List<int> _seatTensCaptured = [0, 0, 0, 0];

  final List<PlayingCard> stockPile = [];
  final List<FlameCardComponent> stockComponents = [];

  final List<PlayingCard> discardPile = [];
  final List<FlameCardComponent> discardComponents = [];

  // Active 4-card trick state (Dhihaeh & Bondi)
  final List<({int seat, PlayingCard card, FlameCardComponent comp})> _trickPlays = [];
  final List<PlayingCard> _team1Tens = [];
  final List<PlayingCard> _team2Tens = [];
  final List<PlayingCard> _burnedCards = [];
  final List<FlameCardComponent> _burnPileComponents = [];

  FlameCardComponent? finishSlotCard;
  FlameCardComponent? selectedCard;
  late final World gameWorld;
  late final _TableSurfaceComponent _tableSurface;

  HolhuashiGameMode activeMode = HolhuashiGameMode.digu;
  GameTurnPhase phase = GameTurnPhase.awaitDraw;
  HandSortMode currentSortMode = HandSortMode.melds;

  bool screenShakeEnabled = true;
  bool fastDealSpeed = false;

  int _roundToken = 0;
  Suit? _trumpSuit;
  int _trickNumber = 0;
  int _trickLeaderSeat = 0;
  int _trickStepIndex = 0;
  Suit? _currentLeadSuit;
  int _team1Tricks = 0;
  int _team2Tricks = 0;

  // Notifiers for Flutter UI HUD
  final ValueNotifier<int> deadwoodPointsNotifier = ValueNotifier<int>(0);
  final ValueNotifier<bool> canGinNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<int> handCountNotifier = ValueNotifier<int>(10);
  final ValueNotifier<String> statusMessageNotifier =
      ValueNotifier<String>('Your Turn: Draw 1 card from Stock or Discard');
  final ValueNotifier<GameTurnPhase> phaseNotifier =
      ValueNotifier<GameTurnPhase>(GameTurnPhase.awaitDraw);
  final ValueNotifier<HolhuashiGameMode> activeModeNotifier =
      ValueNotifier<HolhuashiGameMode>(HolhuashiGameMode.digu);
  final ValueNotifier<Suit?> trumpSuitNotifier = ValueNotifier<Suit?>(null);
  final ValueNotifier<int> activeSeatNotifier = ValueNotifier<int>(0);
  final ValueNotifier<List<SeatInfo>> seatsNotifier =
      ValueNotifier<List<SeatInfo>>([]);
  final ValueNotifier<CapturedTensSummary> capturedTensNotifier =
      ValueNotifier<CapturedTensSummary>(const CapturedTensSummary());
  final ValueNotifier<List<PlayingCard>> burnedCardsNotifier =
      ValueNotifier<List<PlayingCard>>([]);
  final ValueNotifier<int> trickNumberNotifier = ValueNotifier<int>(0);
  final ValueNotifier<Suit?> leadSuitNotifier = ValueNotifier<Suit?>(null);
  final ValueNotifier<bool> hasSelectedCardNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<int> team1TricksNotifier = ValueNotifier<int>(0);
  final ValueNotifier<int> team2TricksNotifier = ValueNotifier<int>(0);

  // Lifecycle & Sensory Callbacks
  void Function(RoundOverData data)? onRoundCompleted;
  Future<Suit> Function(List<PlayingCard> pass1Hand, int declarerSeat)?
      onRequestTrumpDeclaration;

  VoidCallback? onShuffleSound;
  VoidCallback? onCardDealSound;
  VoidCallback? onCardSnapSound;
  VoidCallback? onTrickSweepSound;
  VoidCallback? onGinSlamSound;
  VoidCallback? onFanfareSound;

  double get _speedScale => fastDealSpeed ? 0.45 : 1.0;

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

    _tableSurface = _TableSurfaceComponent(size: Vector2(virtualWidth, virtualHeight))
      ..activeMode = activeMode;
    gameWorld.add(_tableSurface);

    if (autoDealOnLoad) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (isMounted) {
          unawaited(dealNewRound());
        }
      });
    }
  }

  /// Configures the initial game mode prior to dealing (safe before [onLoad]).
  void setInitialMode(HolhuashiGameMode mode) {
    activeMode = mode;
    activeModeNotifier.value = mode;
    if (isLoaded) {
      _tableSurface.activeMode = mode;
    }
  }

  @override
  void onRemove() {
    _roundToken++;
    super.onRemove();
  }

  void updateSettings({
    bool? screenShakeEnabled,
    bool? fastDealSpeed,
  }) {
    if (screenShakeEnabled != null) {
      this.screenShakeEnabled = screenShakeEnabled;
    }
    if (fastDealSpeed != null) {
      this.fastDealSpeed = fastDealSpeed;
    }
  }

  Future<void> switchMode(HolhuashiGameMode mode) async {
    activeMode = mode;
    activeModeNotifier.value = mode;
    _tableSurface.activeMode = mode;
    await dealNewRound();
  }

  Future<void> dealNewRound() async {
    final token = ++_roundToken;

    _clearTableComponents();
    _resetRoundState();

    _setPhase(GameTurnPhase.dealing);
    statusMessageNotifier.value = 'Shuffling & cutting deck...';
    _tableSurface.activeMode = activeMode;
    _tableSurface.trumpSuit = null;

    // Stage 1: 450ms Riffle Shuffle & Cut
    onShuffleSound?.call();
    final shuffleCompleter = Completer<void>();
    gameWorld.add(
      RiffleShuffleComponent(
        center: _tableCenter,
        cardSize: tableCardSize,
        duration: 0.45 * _speedScale,
        onComplete: () {
          if (!shuffleCompleter.isCompleted) shuffleCompleter.complete();
        },
      ),
    );
    await shuffleCompleter.future;
    if (token != _roundToken || !isMounted) return;

    // Stage 2: Mode-specific Deal Sequence
    switch (activeMode) {
      case HolhuashiGameMode.digu:
        await _dealDiguRound(token);
        break;
      case HolhuashiGameMode.dhihaeh:
        await _dealDhihaehRound(token);
        break;
      case HolhuashiGameMode.bondi:
        await _dealBondiRound(token);
        break;
    }
  }

  void _clearTableComponents() {
    selectedCard = null;
    hasSelectedCardNotifier.value = false;

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

    for (final seatList in _seatOpponentComponents) {
      for (final c in seatList) {
        c.removeFromParent();
      }
      seatList.clear();
    }

    for (final play in _trickPlays) {
      play.comp.removeFromParent();
    }
    _trickPlays.clear();

    for (final c in _burnPileComponents) {
      c.removeFromParent();
    }
    _burnPileComponents.clear();

    // Remove any orphaned transient animations/effects
    final transients = gameWorld.children.where(
      (c) =>
          c is ParabolicDealCardComponent ||
          c is PacketBundleComponent ||
          c is RiffleShuffleComponent ||
          c is GoldenShockwaveComponent,
    ).toList();
    for (final t in transients) {
      t.removeFromParent();
    }
  }

  void _resetRoundState() {
    currentHand.clear();
    botHand.clear();
    for (int i = 0; i < 4; i++) {
      _seatHands[i].clear();
      _seatTricksWon[i] = 0;
      _seatTensCaptured[i] = 0;
    }
    stockPile.clear();
    discardPile.clear();
    _team1Tens.clear();
    _team2Tens.clear();
    _burnedCards.clear();

    _trumpSuit = null;
    _trickNumber = 0;
    _trickLeaderSeat = 0;
    _trickStepIndex = 0;
    _currentLeadSuit = null;
    _team1Tricks = 0;
    _team2Tricks = 0;

    trumpSuitNotifier.value = null;
    capturedTensNotifier.value = const CapturedTensSummary();
    burnedCardsNotifier.value = const [];
    trickNumberNotifier.value = 0;
    leadSuitNotifier.value = null;
    team1TricksNotifier.value = 0;
    team2TricksNotifier.value = 0;
    activeSeatNotifier.value = 0;
    deadwoodPointsNotifier.value = 0;
    canGinNotifier.value = false;
    handCountNotifier.value = 0;
    _publishSeats();
  }

  // ---------------------------------------------------------------------------
  // STAGE 2: MODE-SPECIFIC DEAL SEQUENCES
  // ---------------------------------------------------------------------------

  Future<void> _dealDiguRound(int token) async {
    statusMessageNotifier.value = 'Dealing 10 cards each...';
    final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());

    final humanCards = deck.take(10).map((c) => c.copyWith(isFaceDown: false)).toList();
    final oppCards = deck.skip(10).take(10).map((c) => c.copyWith(isFaceDown: true)).toList();

    currentHand.addAll(humanCards);
    _sortCurrentHand(currentSortMode);
    botHand.addAll(oppCards);

    stockPile.addAll(deck.skip(20));
    final initialDiscard = stockPile.isNotEmpty
        ? stockPile.removeLast().copyWith(isFaceDown: false)
        : null;
    if (initialDiscard != null) {
      discardPile.add(initialDiscard);
    }

    _layoutStockOnly();

    // Animate 10 cards to South (with 3D flip) & 10 to North Bot
    final dealCompleter = Completer<void>();
    int pending = 20 + (initialDiscard != null ? 1 : 0);

    void onOneArrived() {
      pending--;
      if (pending <= 0 && !dealCompleter.isCompleted) {
        dealCompleter.complete();
      }
    }

    final stagger = 0.045 * _speedScale;
    final flightDur = 0.25 * _speedScale;
    final flipDur = 0.15 * _speedScale;

    final southLayout = _computeSouthFanTargets(currentHand.length);
    final oppLayout = _computeNorthOppTargets(botHand.length);

    for (int i = 0; i < 10; i++) {
      final sCard = currentHand[i];
      final sTarget = southLayout[i];
      gameWorld.add(
        ParabolicDealCardComponent(
          card: sCard.copyWith(isFaceDown: true),
          startPos: _tableCenter,
          endPos: sTarget.pos,
          startSize: tableCardSize,
          cardSize: handCardSize,
          endAngle: sTarget.angle,
          delay: (i * 2) * stagger,
          flightDuration: flightDur,
          flipDuration: flipDur,
          flipOnArrival: true,
          onLaunch: () => onCardDealSound?.call(),
          onArrived: () {
            if (token == _roundToken && isMounted) {
              _spawnSingleHandCardAt(i, sCard, sTarget.pos, sTarget.angle);
            }
            onOneArrived();
          },
        ),
      );

      final nCard = botHand[i];
      final nPos = oppLayout[i];
      gameWorld.add(
        ParabolicDealCardComponent(
          card: nCard.copyWith(isFaceDown: true),
          startPos: _tableCenter,
          endPos: nPos,
          startSize: tableCardSize,
          cardSize: opponentCardSize,
          delay: ((i * 2) + 1) * stagger,
          flightDuration: flightDur,
          flipOnArrival: false,
          onArrived: () {
            if (token == _roundToken && isMounted) {
              _spawnSingleNorthCardAt(i, nCard, nPos);
            }
            onOneArrived();
          },
        ),
      );
    }

    if (initialDiscard != null) {
      gameWorld.add(
        ParabolicDealCardComponent(
          card: initialDiscard.copyWith(isFaceDown: true),
          startPos: _stockPos,
          endPos: _discardPos,
          cardSize: tableCardSize,
          delay: 20 * stagger,
          flightDuration: flightDur,
          flipDuration: flipDur,
          flipOnArrival: true,
          onArrived: onOneArrived,
        ),
      );
    }

    await dealCompleter.future;
    if (token != _roundToken || !isMounted) return;

    _setPhase(GameTurnPhase.awaitDraw);
    activeSeatNotifier.value = 0;
    statusMessageNotifier.value = 'Your Turn: Draw 1 card from Stock or Discard';
    _layoutTablePiles();
    _layoutOpponentHand();
    _recalculateAnalysisAndLayoutHand();
    _publishSeats();
  }

  Future<void> _dealDhihaehRound(int token) async {
    final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
    final fullHands = DhihaehEngine.deal3PassBatch(shuffledDeck: deck, dealerSeat: 3);

    // Pass 1: 5 cards each, anti-clockwise (S=0 -> E=1 -> N=2 -> W=3)
    statusMessageNotifier.value = 'Dhihaeh Pass 1: Dealing 5 cards each (S → E → N → W)...';
    await _animateDhihaehPacketPass(
      token: token,
      cardCount: 5,
      fullHands: fullHands,
      sliceStart: 0,
      sliceEnd: 5,
    );
    if (token != _roundToken || !isMounted) return;

    // Pause for Trump Declaration after Pass 1
    _setPhase(GameTurnPhase.awaitTrump);
    activeSeatNotifier.value = 0;
    statusMessageNotifier.value = 'Pass 1 Dealt: Declare Trump Suit (Hukum)';
    _publishSeats();

    Suit chosenTrump;
    if (onRequestTrumpDeclaration != null) {
      chosenTrump = await onRequestTrumpDeclaration!(
        List.unmodifiable(_seatHands[0]),
        0,
      );
    } else {
      await Future.delayed(Duration(milliseconds: fastDealSpeed ? 200 : 450));
      chosenTrump = _pickBestSuitInHand(_seatHands[0]);
    }
    if (token != _roundToken || !isMounted) return;

    _trumpSuit = chosenTrump;
    trumpSuitNotifier.value = chosenTrump;
    _tableSurface.trumpSuit = chosenTrump;
    onFanfareSound?.call();

    // Pass 2: 4 cards each (S -> E -> N -> W)
    _setPhase(GameTurnPhase.dealing);
    statusMessageNotifier.value =
        'Trump: ${chosenTrump.symbol} ${chosenTrump.name.toUpperCase()} • Pass 2 (4 cards)...';
    await _animateDhihaehPacketPass(
      token: token,
      cardCount: 4,
      fullHands: fullHands,
      sliceStart: 5,
      sliceEnd: 9,
    );
    if (token != _roundToken || !isMounted) return;

    // Pass 3: 4 cards each (S -> E -> N -> W)
    statusMessageNotifier.value = 'Pass 3: Completing 13-card hands...';
    await _animateDhihaehPacketPass(
      token: token,
      cardCount: 4,
      fullHands: fullHands,
      sliceStart: 9,
      sliceEnd: 13,
    );
    if (token != _roundToken || !isMounted) return;

    // Sort South's 13 cards cleanly by suit & strength
    DhihaehEngine.sortHand(_seatHands[0]);
    currentHand
      ..clear()
      ..addAll(_seatHands[0]);
    _rebuildAllFourSeatVisuals();

    // Begin Trick 1 led by South (seat 0, right of West dealer)
    _startTrick(leaderSeat: 0, trickNum: 1, token: token);
  }

  Future<void> _animateDhihaehPacketPass({
    required int token,
    required int cardCount,
    required List<List<PlayingCard>> fullHands,
    required int sliceStart,
    required int sliceEnd,
  }) async {
    final completer = Completer<void>();
    int pending = 4;
    final stagger = 0.095 * _speedScale;
    final dur = 0.30 * _speedScale;

    for (int p = 0; p < 4; p++) {
      final seat = p; // Anti-clockwise: 0(S) -> 1(E) -> 2(N) -> 3(W)
      final target = _seatAnchor(seat);
      gameWorld.add(
        PacketBundleComponent(
          cardCount: cardCount,
          startPos: _tableCenter,
          endPos: target.pos,
          endAngle: target.angle,
          cardSize: tableCardSize,
          delay: p * stagger,
          duration: dur,
          onLaunch: () => onCardDealSound?.call(),
          onComplete: () {
            if (token == _roundToken && isMounted) {
              final slice = fullHands[seat].sublist(sliceStart, sliceEnd);
              if (seat == 0) {
                final revealed =
                    slice.map((c) => c.copyWith(isFaceDown: false)).toList();
                _seatHands[0].addAll(revealed);
                DhihaehEngine.sortHand(_seatHands[0]);
                currentHand
                  ..clear()
                  ..addAll(_seatHands[0]);
                _recalculateAnalysisAndLayoutHand();
              } else {
                _seatHands[seat].addAll(
                  slice.map((c) => c.copyWith(isFaceDown: true)),
                );
                _layoutFourSeatOpponents();
              }
              _publishSeats();
            }
            pending--;
            if (pending <= 0 && !completer.isCompleted) {
              completer.complete();
            }
          },
        ),
      );
    }

    await completer.future;
  }

  Future<void> _dealBondiRound(int token) async {
    statusMessageNotifier.value = 'Bondi: Dealing 52 cards (13 per seat)...';
    final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
    final dealt = BondiEngine.dealCards(deck: deck, playerCount: 4);

    for (int s = 0; s < 4; s++) {
      if (s == 0) {
        final revealed = dealt[0].map((c) => c.copyWith(isFaceDown: false)).toList();
        BondiEngine.sortHand(revealed);
        _seatHands[0]
          ..clear()
          ..addAll(revealed);
        currentHand
          ..clear()
          ..addAll(revealed);
      } else {
        _seatHands[s]
          ..clear()
          ..addAll(dealt[s].map((c) => c.copyWith(isFaceDown: true)));
      }
    }

    // Parabolic deal animation across 4 seats (13 cards each, rapid staggered waves)
    final completer = Completer<void>();
    int pending = 52;
    final stagger = 0.014 * _speedScale;
    final flightDur = 0.22 * _speedScale;
    final flipDur = 0.12 * _speedScale;

    final southTargets = _computeSouthFanTargets(13);

    int dealOrder = 0;
    for (int round = 0; round < 13; round++) {
      for (int seat = 0; seat < 4; seat++) {
        final idx = dealOrder++;
        final card = _seatHands[seat][round];
        final isSouth = seat == 0;
        final endPos = isSouth ? southTargets[round].pos : _seatAnchor(seat).pos;
        final endAngle =
            isSouth ? southTargets[round].angle : _seatAnchor(seat).angle;

        gameWorld.add(
          ParabolicDealCardComponent(
            card: card.copyWith(isFaceDown: true),
            startPos: _tableCenter,
            endPos: endPos,
            startSize: tableCardSize,
            cardSize: isSouth ? handCardSize : opponentCardSize,
            endAngle: endAngle,
            delay: idx * stagger,
            flightDuration: flightDur,
            flipDuration: flipDur,
            flipOnArrival: isSouth,
            onLaunch: idx.isEven ? () => onCardDealSound?.call() : null,
            onArrived: () {
              pending--;
              if (pending <= 0 && !completer.isCompleted) {
                completer.complete();
              }
            },
          ),
        );
      }
    }

    await completer.future;
    if (token != _roundToken || !isMounted) return;

    _rebuildAllFourSeatVisuals();
    final aceSpadesHolder = BondiEngine.findAceOfSpadesHolder(_seatHands);
    statusMessageNotifier.value =
        '${_seatName(aceSpadesHolder)} holds ♠A and leads Trick 1!';
    _startTrick(leaderSeat: aceSpadesHolder, trickNum: 1, token: token);
  }

  Suit _pickBestSuitInHand(List<PlayingCard> hand) {
    final counts = <Suit, int>{};
    for (final c in hand) {
      counts[c.suit] = (counts[c.suit] ?? 0) + 1;
    }
    Suit best = Suit.spades;
    int bestCount = -1;
    for (final entry in counts.entries) {
      if (entry.value > bestCount) {
        bestCount = entry.value;
        best = entry.key;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // STAGE 3: DIGU DRAW (FLYING CARD ANIMATION) & DISCARD
  // ---------------------------------------------------------------------------

  void sortHand(HandSortMode mode) {
    currentSortMode = mode;
    _sortCurrentHand(mode);
    _recalculateAnalysisAndLayoutHand();
  }

  void _sortCurrentHand(HandSortMode mode) {
    switch (mode) {
      case HandSortMode.melds:
        final sorted = HandSorter.sortByMelds(currentHand);
        currentHand
          ..clear()
          ..addAll(sorted);
        break;
      case HandSortMode.suit:
        final sorted = HandSorter.sortBySuit(currentHand);
        currentHand
          ..clear()
          ..addAll(sorted);
        break;
      case HandSortMode.rank:
        final sorted = HandSorter.sortByRank(currentHand);
        currentHand
          ..clear()
          ..addAll(sorted);
        break;
    }
  }

  void drawCardFromStock() {
    if (activeMode != HolhuashiGameMode.digu) return;
    if (phase != GameTurnPhase.awaitDraw) return;
    if (currentHand.length >= 11) return;

    if (stockPile.isEmpty) {
      _recycleDiscardIntoStock();
      if (stockPile.isEmpty) return;
    }

    final token = _roundToken;
    _setPhase(GameTurnPhase.dealing);
    statusMessageNotifier.value = 'Drawing from Stock...';

    final drawn = stockPile.removeLast().copyWith(isFaceDown: false);
    _layoutTablePiles();

    final previewTargets = _computeSouthFanTargets(currentHand.length + 1);
    final dest = previewTargets.last;

    gameWorld.add(
      ParabolicDealCardComponent(
        card: drawn.copyWith(isFaceDown: true),
        startPos: _stockPos,
        endPos: dest.pos,
        startSize: tableCardSize,
        cardSize: handCardSize,
        endAngle: dest.angle,
        flightDuration: 0.25 * _speedScale,
        flipDuration: 0.14 * _speedScale,
        flipOnArrival: true,
        onLaunch: () => onCardDealSound?.call(),
        onArrived: () {
          if (token != _roundToken || !isMounted) return;
          currentHand.add(drawn);
          _setPhase(GameTurnPhase.awaitAction);
          statusMessageNotifier.value = 'Discard 1 card or Declare Gin';
          _recalculateAnalysisAndLayoutHand();
          _publishSeats();
        },
      ),
    );
  }

  void drawCardFromDiscard() {
    if (activeMode != HolhuashiGameMode.digu) return;
    if (phase != GameTurnPhase.awaitDraw) return;
    if (discardPile.isEmpty || currentHand.length >= 11) return;

    final token = _roundToken;
    _setPhase(GameTurnPhase.dealing);
    statusMessageNotifier.value = 'Picking up Discard...';

    final drawn = discardPile.removeLast().copyWith(isFaceDown: false);
    _layoutTablePiles();

    final previewTargets = _computeSouthFanTargets(currentHand.length + 1);
    final dest = previewTargets.last;

    gameWorld.add(
      ParabolicDealCardComponent(
        card: drawn,
        startPos: _discardPos,
        endPos: dest.pos,
        startSize: tableCardSize,
        cardSize: handCardSize,
        endAngle: dest.angle,
        flightDuration: 0.24 * _speedScale,
        flipOnArrival: false,
        onLaunch: () => onCardSnapSound?.call(),
        onArrived: () {
          if (token != _roundToken || !isMounted) return;
          currentHand.add(drawn);
          _setPhase(GameTurnPhase.awaitAction);
          statusMessageNotifier.value = 'Discard 1 card or Declare Gin';
          _recalculateAnalysisAndLayoutHand();
          _publishSeats();
        },
      ),
    );
  }

  void _recycleDiscardIntoStock() {
    if (discardPile.length <= 1) return;
    final top = discardPile.removeLast();
    final recycled = discardPile.map((c) => c.copyWith(isFaceDown: true)).toList();
    discardPile
      ..clear()
      ..add(top);
    stockPile.addAll(DeckEngine.shuffle(recycled));
    _layoutTablePiles();
  }

  /// Plays or discards the currently selected card in any active mode.
  void playSelectedCard() {
    discardSelectedCard();
  }

  void discardSelectedCard() {
    if (selectedCard == null || phase != GameTurnPhase.awaitAction) return;
    if (activeMode == HolhuashiGameMode.digu) {
      discardCard(selectedCard!);
    } else {
      if (selectedCard!.isPlayable) {
        _playHumanTrickCard(selectedCard!);
      }
    }
  }

  void discardCard(FlameCardComponent cardComp) {
    if (activeMode != HolhuashiGameMode.digu) {
      if (phase == GameTurnPhase.awaitAction && cardComp.isPlayable) {
        _playHumanTrickCard(cardComp);
      }
      return;
    }
    if (phase != GameTurnPhase.awaitAction) return;

    final idx = handCardComponents.indexOf(cardComp);
    if (idx == -1) return;

    final startPos = cardComp.position.clone();
    final startAngle = cardComp.angle;

    handCardComponents.removeAt(idx);
    final card = currentHand.removeAt(idx);
    cardComp.removeFromParent();

    selectedCard = null;
    hasSelectedCardNotifier.value = false;
    onCardSnapSound?.call();

    _recalculateAnalysisAndLayoutHand();
    _publishSeats();

    final token = _roundToken;
    _setPhase(GameTurnPhase.botThinking);
    statusMessageNotifier.value = 'North Bot is thinking...';

    gameWorld.add(
      ParabolicDealCardComponent(
        card: card.copyWith(isFaceDown: false),
        startPos: startPos,
        endPos: _discardPos,
        startSize: handCardSize,
        cardSize: tableCardSize,
        startAngle: startAngle,
        endAngle: 0.0,
        flightDuration: 0.22 * _speedScale,
        flipOnArrival: false,
        onArrived: () {
          if (token != _roundToken || !isMounted) return;
          discardPile.add(card.copyWith(isFaceDown: false));
          _layoutTablePiles();
          unawaited(_startBotTurn(token));
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 6: GIN SLAM (1.28x LIFT, FACE-DOWN FLIP, CAMERA SHAKE, DUAL RINGS)
  // ---------------------------------------------------------------------------

  bool _canCardTriggerGinSlam(PlayingCard finishCandidate) {
    if (currentHand.length != 11) return false;
    final remaining10 = [
      for (final c in currentHand)
        if (c.id != finishCandidate.id) c,
    ];
    if (RummyValidator.checkThousandPointRun(remaining10)) return true;
    final opt = TeamHandOptimizer.optimizeMergedHand(remaining10);
    return opt.debtScore == 0 && RummyValidator.isValidGinHand(opt.melds);
  }

  void declareGinSlam() {
    if (activeMode != HolhuashiGameMode.digu) return;
    if (phase != GameTurnPhase.awaitAction) return;
    if (currentHand.length != 11) return;

    // Prefer selectedCard if it yields valid Gin; otherwise scan all 11
    if (selectedCard != null && _canCardTriggerGinSlam(selectedCard!.card)) {
      unawaited(_executeHumanGinSlamWithCard(selectedCard!));
      return;
    }

    for (final comp in handCardComponents) {
      if (_canCardTriggerGinSlam(comp.card)) {
        unawaited(_executeHumanGinSlamWithCard(comp));
        return;
      }
    }
  }

  Future<void> _executeHumanGinSlamWithCard(FlameCardComponent comp) async {
    final token = _roundToken;
    final finishCard = comp.card;
    final startPos = comp.position.clone();
    final idx = handCardComponents.indexOf(comp);
    if (idx != -1) {
      handCardComponents.removeAt(idx);
    }
    comp.removeFromParent();
    currentHand.remove(finishCard);

    selectedCard = null;
    hasSelectedCardNotifier.value = false;

    final faceUpHuman = currentHand.map((c) => c.copyWith(isFaceDown: false)).toList();
    final faceUpBot = botHand.map((c) => c.copyWith(isFaceDown: false)).toList();
    final isThousandRun = RummyValidator.checkThousandPointRun(faceUpHuman);
    final humanOpt = TeamHandOptimizer.optimizeMergedHand(faceUpHuman);
    final botOpt = TeamHandOptimizer.optimizeMergedHand(faceUpBot);

    _setPhase(GameTurnPhase.roundOver);
    statusMessageNotifier.value =
        isThousandRun ? '⚡ 1,000-POINT RUN SLAM!' : '⚡ GIN SLAM VICTORY!';

    _slamFinishCard(finishCard, fromPos: startPos);
    _recalculateAnalysisAndLayoutHand();
    _publishSeats();

    final meldScore = isThousandRun ? 1000 : humanOpt.meldScore;
    final ginBonus = isThousandRun ? 0 : 100;
    final humanRoundScore = meldScore + ginBonus;
    final opponentRoundScore = botOpt.meldScore;

    await Future.delayed(Duration(milliseconds: fastDealSpeed ? 650 : 1200));
    if (token != _roundToken || !isMounted) return;

    onFanfareSound?.call();
    onRoundCompleted?.call(
      RoundOverData(
        humanWon: true,
        winnerName: 'You (South)',
        winningMelds: isThousandRun ? [faceUpHuman] : humanOpt.melds,
        deadwood: const [],
        meldScore: meldScore,
        debtScore: 0,
        ginBonus: ginBonus,
        netRoundScore: humanRoundScore,
        humanRoundScore: humanRoundScore,
        opponentRoundScore: opponentRoundScore,
        mode: HolhuashiGameMode.digu,
        summaryHeadline: isThousandRun
            ? '1,000-Point Suited Run!'
            : '0 Deadwood Gin Slam!',
      ),
    );
  }

  void _slamFinishCard(PlayingCard card, {Vector2? fromPos}) {
    final finishPos = _ginPortalPos;
    final launchPos = fromPos ?? finishPos;

    // 1.28x lift & face-down flip onto Center Gin Slam Portal
    gameWorld.add(
      _GinSlamCardComponent(
        card: card.copyWith(isFaceDown: false),
        startPos: launchPos,
        endPos: finishPos,
        cardSize: tableCardSize,
        onImpact: () {
          finishSlotCard?.removeFromParent();
          final landed = FlameCardComponent(
            card: card.copyWith(isFaceDown: true),
            position: finishPos,
            size: tableCardSize,
            isDraggable: false,
          );
          landed.priority = 500;
          landed.scale = Vector2.all(1.28);
          finishSlotCard = landed;
          gameWorld.add(landed);

          // Dual GoldenShockwaveComponent rings
          gameWorld.add(
            GoldenShockwaveComponent(
              center: finishPos,
              maxRadius: 380.0,
              duration: 0.72,
              delay: 0.0,
              initialStrokeWidth: 6.5,
            ),
          );
          gameWorld.add(
            GoldenShockwaveComponent(
              center: finishPos,
              maxRadius: 480.0,
              duration: 0.85,
              delay: 0.14,
              initialStrokeWidth: 4.5,
            ),
          );

          // Decaying sinusoidal camera shake (toggleable via screenShakeEnabled)
          if (screenShakeEnabled) {
            add(
              CameraShakeComponent(
                camera: camera,
                duration: 0.50,
                intensity: 18.0,
                frequency: 26.0,
              ),
            );
          }

          onGinSlamSound?.call();
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // DIGU BOT TURN
  // ---------------------------------------------------------------------------

  Future<void> _startBotTurn(int token) async {
    if (token != _roundToken || !isMounted) return;
    _setPhase(GameTurnPhase.botThinking);
    activeSeatNotifier.value = 2;
    _publishSeats();
    statusMessageNotifier.value = 'North Bot is thinking...';

    await Future.delayed(Duration(milliseconds: fastDealSpeed ? 450 : 1000));
    if (token != _roundToken || !isMounted || phase != GameTurnPhase.botThinking) {
      return;
    }

    if (stockPile.isEmpty) {
      _recycleDiscardIntoStock();
    }

    final topDiscard = discardPile.isNotEmpty ? discardPile.last : null;
    final shouldDrawDiscard = DiguAI.shouldDrawDiscard(
      botHand: botHand,
      topDiscard: topDiscard,
    );

    final oppAnchor = _seatAnchor(2).pos;
    if (shouldDrawDiscard && discardPile.isNotEmpty) {
      final drawn = discardPile.removeLast();
      _layoutTablePiles();
      statusMessageNotifier.value = 'North Bot drew from Discard pile';

      final c = Completer<void>();
      gameWorld.add(
        ParabolicDealCardComponent(
          card: drawn,
          startPos: _discardPos,
          endPos: oppAnchor,
          startSize: tableCardSize,
          cardSize: opponentCardSize,
          flightDuration: 0.24 * _speedScale,
          flipOnArrival: false,
          onLaunch: () => onCardDealSound?.call(),
          onArrived: () {
            if (!c.isCompleted) c.complete();
          },
        ),
      );
      await c.future;
      if (token != _roundToken || !isMounted) return;
      botHand.add(drawn.copyWith(isFaceDown: true));
    } else if (stockPile.isNotEmpty) {
      final drawn = stockPile.removeLast().copyWith(isFaceDown: true);
      _layoutTablePiles();
      statusMessageNotifier.value = 'North Bot drew from Stock pile';

      final c = Completer<void>();
      gameWorld.add(
        ParabolicDealCardComponent(
          card: drawn,
          startPos: _stockPos,
          endPos: oppAnchor,
          startSize: tableCardSize,
          cardSize: opponentCardSize,
          flightDuration: 0.24 * _speedScale,
          flipOnArrival: false,
          onLaunch: () => onCardDealSound?.call(),
          onArrived: () {
            if (!c.isCompleted) c.complete();
          },
        ),
      );
      await c.future;
      if (token != _roundToken || !isMounted) return;
      botHand.add(drawn);
    }

    _layoutOpponentHand();
    _publishSeats();

    await Future.delayed(Duration(milliseconds: fastDealSpeed ? 380 : 850));
    if (token != _roundToken || !isMounted || phase != GameTurnPhase.botThinking) {
      return;
    }

    final botDecision = DiguAI.chooseBestAction(botHand);
    botHand.remove(botDecision.cardToDiscard);
    _layoutOpponentHand();

    if (botDecision.isGinSlam) {
      _setPhase(GameTurnPhase.roundOver);
      statusMessageNotifier.value = '⚡ NORTH BOT SLAMMED GIN!';

      _slamFinishCard(botDecision.cardToDiscard, fromPos: oppAnchor);
      final faceUpBot = botHand.map((c) => c.copyWith(isFaceDown: false)).toList();
      final faceUpHuman = currentHand.map((c) => c.copyWith(isFaceDown: false)).toList();
      final isBotThousandRun = RummyValidator.checkThousandPointRun(faceUpBot);
      final botOpt = TeamHandOptimizer.optimizeMergedHand(faceUpBot);
      final humanOpt = TeamHandOptimizer.optimizeMergedHand(faceUpHuman);

      final botMeldScore = isBotThousandRun ? 1000 : botOpt.meldScore;
      final botGinBonus = isBotThousandRun ? 0 : 100;
      final opponentRoundScore = botMeldScore + botGinBonus;
      final humanRoundScore = humanOpt.meldScore;

      await Future.delayed(Duration(milliseconds: fastDealSpeed ? 650 : 1200));
      if (token != _roundToken || !isMounted) return;

      onFanfareSound?.call();
      onRoundCompleted?.call(
        RoundOverData(
          humanWon: false,
          winnerName: 'North Bot',
          winningMelds: isBotThousandRun ? [faceUpBot] : botOpt.melds,
          deadwood: isBotThousandRun ? const [] : botOpt.deadwood,
          meldScore: botMeldScore,
          debtScore: isBotThousandRun ? 0 : botOpt.debtScore,
          ginBonus: botGinBonus,
          netRoundScore: opponentRoundScore,
          humanRoundScore: humanRoundScore,
          opponentRoundScore: opponentRoundScore,
          mode: HolhuashiGameMode.digu,
          summaryHeadline: botDecision.reason ?? 'North Bot Gin Slam',
        ),
      );
      return;
    }

    // Animate Bot discard card flying into Discard pile
    final discardFlight = Completer<void>();
    gameWorld.add(
      ParabolicDealCardComponent(
        card: botDecision.cardToDiscard.copyWith(isFaceDown: true),
        startPos: oppAnchor,
        endPos: _discardPos,
        startSize: opponentCardSize,
        cardSize: tableCardSize,
        flightDuration: 0.24 * _speedScale,
        flipDuration: 0.13 * _speedScale,
        flipOnArrival: true,
        onLaunch: () => onCardSnapSound?.call(),
        onArrived: () {
          if (!discardFlight.isCompleted) discardFlight.complete();
        },
      ),
    );
    await discardFlight.future;
    if (token != _roundToken || !isMounted) return;

    discardPile.add(botDecision.cardToDiscard.copyWith(isFaceDown: false));
    _layoutTablePiles();

    _setPhase(GameTurnPhase.awaitDraw);
    activeSeatNotifier.value = 0;
    _publishSeats();
    statusMessageNotifier.value = 'Your Turn: Draw 1 card from Stock or Discard';
  }

  // ---------------------------------------------------------------------------
  // STAGE 5: 4-SEAT SEQUENTIAL TRICK PLAY (DHIHAEH & BONDI)
  // ---------------------------------------------------------------------------

  void _startTrick({
    required int leaderSeat,
    required int trickNum,
    required int token,
  }) {
    if (token != _roundToken || !isMounted) return;

    for (final p in _trickPlays) {
      p.comp.removeFromParent();
    }
    _trickPlays.clear();

    _trickNumber = trickNum;
    _trickLeaderSeat = leaderSeat;
    _trickStepIndex = 0;
    _currentLeadSuit = null;

    trickNumberNotifier.value = trickNum;
    leadSuitNotifier.value = null;

    unawaited(_advanceTrickStep(token));
  }

  Future<void> _advanceTrickStep(int token) async {
    if (token != _roundToken || !isMounted) return;

    if (_trickStepIndex >= 4) {
      await _resolveCompletedTrick(token);
      return;
    }

    final seat = (_trickLeaderSeat + _trickStepIndex) % 4;
    // Skip empty-handed seats in Bondi if a player already emptied out
    if (_seatHands[seat].isEmpty) {
      _trickStepIndex++;
      await _advanceTrickStep(token);
      return;
    }

    activeSeatNotifier.value = seat;
    _publishSeats();

    if (seat == 0) {
      _setPhase(GameTurnPhase.awaitAction);
      _updateTrickHandPlayability(forHumanTurn: true);
      final leadLabel = _currentLeadSuit == null
          ? 'Lead any card'
          : 'Follow ${_currentLeadSuit!.symbol} ${_currentLeadSuit!.name.toUpperCase()}';
      if (activeMode == HolhuashiGameMode.bondi &&
          _trickNumber == 1 &&
          _trickPlays.isEmpty &&
          _seatHands[0].any((c) => c.suit == Suit.spades && c.rank == 1)) {
        statusMessageNotifier.value = 'Trick 1 Lead: Play Ace of Spades (♠A)';
      } else {
        statusMessageNotifier.value = 'Trick $_trickNumber • Your Turn: $leadLabel';
      }
      return;
    }

    // AI Seat Turn (East=1, North=2, West=3)
    _setPhase(GameTurnPhase.botThinking);
    _updateTrickHandPlayability(forHumanTurn: false);
    statusMessageNotifier.value =
        'Trick $_trickNumber • ${_seatName(seat)} thinking...';

    await Future.delayed(Duration(milliseconds: fastDealSpeed ? 180 : 380));
    if (token != _roundToken || !isMounted) return;

    final chosen = _selectAITrickCard(seat);
    _seatHands[seat].remove(chosen);
    _layoutFourSeatOpponents();
    _publishSeats();

    await _animateAndPlaceTrickCard(
      seat: seat,
      card: chosen.copyWith(isFaceDown: false),
      fromPos: _seatAnchor(seat).pos,
      fromAngle: _seatAnchor(seat).angle,
      fromSize: opponentCardSize,
      token: token,
    );
    if (token != _roundToken || !isMounted) return;

    _trickStepIndex++;
    await _advanceTrickStep(token);
  }

  PlayingCard _selectAITrickCard(int seat) {
    if (activeMode == HolhuashiGameMode.dhihaeh) {
      final botPlayer = DhihaehPlayer(
        id: 'seat-$seat',
        name: _seatName(seat),
        seatIndex: seat,
        teamId: (seat == 0 || seat == 2) ? 'TEAM_1' : 'TEAM_2',
        isAI: true,
        hand: _seatHands[seat],
      );
      return DhihaehAI.selectCardToPlay(
        bot: botPlayer,
        currentTrick: _buildDhihaehTrick(),
        trumpSuit: _trumpSuit,
        partnerSeat: (seat + 2) % 4,
      );
    }

    return BondiAI.selectCardToPlay(
      hand: _seatHands[seat],
      currentTrick: _buildBondiTrick(),
    );
  }

  void _playHumanTrickCard(FlameCardComponent comp) {
    if (phase != GameTurnPhase.awaitAction) return;
    if (activeMode != HolhuashiGameMode.dhihaeh &&
        activeMode != HolhuashiGameMode.bondi) {
      return;
    }
    if (!comp.isPlayable) {
      comp.springReturnToResting();
      return;
    }

    final token = _roundToken;
    final card = comp.card.copyWith(isFaceDown: false);
    final startPos = comp.position.clone();
    final startAngle = comp.angle;

    final idx = handCardComponents.indexOf(comp);
    if (idx != -1) {
      handCardComponents.removeAt(idx);
    }
    comp.removeFromParent();
    _seatHands[0].remove(card);
    currentHand.remove(card);

    selectedCard = null;
    hasSelectedCardNotifier.value = false;
    _setPhase(GameTurnPhase.dealing);
    _updateTrickHandPlayability(forHumanTurn: false);
    _recalculateAnalysisAndLayoutHand();
    _publishSeats();

    unawaited(
      _animateAndPlaceTrickCard(
        seat: 0,
        card: card,
        fromPos: startPos,
        fromAngle: startAngle,
        fromSize: handCardSize,
        token: token,
      ).then((_) async {
        if (token != _roundToken || !isMounted) return;
        _trickStepIndex++;
        await _advanceTrickStep(token);
      }),
    );
  }

  Future<void> _animateAndPlaceTrickCard({
    required int seat,
    required PlayingCard card,
    required Vector2 fromPos,
    required double fromAngle,
    required Vector2 fromSize,
    required int token,
  }) async {
    final slotPos = _trickSlotPos(seat);
    final completer = Completer<void>();

    gameWorld.add(
      ParabolicDealCardComponent(
        card: card.copyWith(isFaceDown: seat != 0),
        startPos: fromPos,
        endPos: slotPos,
        startSize: fromSize,
        cardSize: tableCardSize,
        startAngle: fromAngle,
        endAngle: 0.0,
        flightDuration: 0.22 * _speedScale,
        flipDuration: 0.12 * _speedScale,
        flipOnArrival: seat != 0,
        onLaunch: () => onCardSnapSound?.call(),
        onArrived: () {
          if (!completer.isCompleted) completer.complete();
        },
      ),
    );

    await completer.future;
    if (token != _roundToken || !isMounted) return;

    if (_currentLeadSuit == null) {
      _currentLeadSuit = card.suit;
      leadSuitNotifier.value = card.suit;
    }

    final placed = FlameCardComponent(
      card: card.copyWith(isFaceDown: false),
      position: slotPos,
      size: tableCardSize,
      isDraggable: false,
      basePriority: 60 + _trickPlays.length,
    );
    _trickPlays.add((seat: seat, card: card, comp: placed));
    gameWorld.add(placed);
  }

  Future<void> _resolveCompletedTrick(int token) async {
    if (_trickPlays.isEmpty) return;

    _setPhase(GameTurnPhase.trickResolving);

    final int winnerSeat;
    if (activeMode == HolhuashiGameMode.dhihaeh) {
      winnerSeat = DhihaehValidator.resolveTrickWinner(
        _buildDhihaehTrick(),
        _trumpSuit,
      );
    } else {
      winnerSeat = BondiValidator.resolveTrickWinner(_buildBondiTrick());
    }

    // Gold winner rim highlight on winning card
    for (final play in _trickPlays) {
      if (play.seat == winnerSeat) {
        play.comp.isWinnerHighlight = true;
        play.comp.priority = 120;
      }
    }

    final winnerName = _seatName(winnerSeat);
    statusMessageNotifier.value =
        '★ $winnerName wins Trick $_trickNumber!';
    _publishSeats();

    // 650ms read pause before sweeping the 4-card trick
    await Future.delayed(const Duration(milliseconds: 650));
    if (token != _roundToken || !isMounted) return;

    if (activeMode == HolhuashiGameMode.dhihaeh) {
      await _sweepDhihaehTrick(winnerSeat: winnerSeat, token: token);
    } else {
      await _sweepBondiTrick(winnerSeat: winnerSeat, token: token);
    }
  }

  Future<void> _sweepDhihaehTrick({
    required int winnerSeat,
    required int token,
  }) async {
    final sweepTarget = _seatAnchor(winnerSeat).pos;
    onTrickSweepSound?.call();

    await _animateTrickSweep(targetPos: sweepTarget, token: token);
    if (token != _roundToken || !isMounted) return;

    final trickCards = _trickPlays.map((p) => p.card).toList();
    _trickPlays.clear();

    final tensInTrick = trickCards.where((c) => c.rank == 10).toList();
    final isTeam1 = winnerSeat == 0 || winnerSeat == 2;
    if (isTeam1) {
      _team1Tricks++;
      _team1Tens.addAll(tensInTrick);
    } else {
      _team2Tricks++;
      _team2Tens.addAll(tensInTrick);
    }
    _seatTricksWon[winnerSeat]++;
    _seatTensCaptured[winnerSeat] += tensInTrick.length;

    team1TricksNotifier.value = _team1Tricks;
    team2TricksNotifier.value = _team2Tricks;
    capturedTensNotifier.value = CapturedTensSummary(
      team1Count: _team1Tens.length,
      team2Count: _team2Tens.length,
      team1Cards: List.unmodifiable(_team1Tens),
      team2Cards: List.unmodifiable(_team2Tens),
    );
    _publishSeats();

    // Check round end (all 13 tricks completed or Haasbagga 4 Tens)
    final allHandsEmpty = _seatHands.every((h) => h.isEmpty);
    if (_trickNumber >= 13 || allHandsEmpty) {
      _finishDhihaehRound();
      return;
    }

    _startTrick(
      leaderSeat: winnerSeat,
      trickNum: _trickNumber + 1,
      token: token,
    );
  }

  void _finishDhihaehRound() {
    _setPhase(GameTurnPhase.roundOver);
    final score = DhihaehEngine.evaluateRoundScore(
      team1Tens: _team1Tens.length,
      team2Tens: _team2Tens.length,
      team1Tricks: _team1Tricks,
      team2Tricks: _team2Tricks,
      team1PreviousScore: 0,
      team2PreviousScore: 0,
    );

    final team1Won = score.handWinnerTeam == 'TEAM_1';
    final isHaasbagga = score.outcomeType == DhihaehOutcome.haasbagga;
    final headline = isHaasbagga
        ? 'HAASBAGGA! All 4 Tens Captured (1,000 pts)!'
        : team1Won
            ? 'Team South/North Won ($_team1Tricks tricks • ${_team1Tens.length} Tens)'
            : 'Team East/West Won ($_team2Tricks tricks • ${_team2Tens.length} Tens)';

    statusMessageNotifier.value = headline;
    onFanfareSound?.call();

    onRoundCompleted?.call(
      RoundOverData(
        humanWon: team1Won,
        winnerName: team1Won ? 'Team You & North' : 'Team East & West',
        winningMelds: _team1Tens.isNotEmpty || _team2Tens.isNotEmpty
            ? [if (team1Won) _team1Tens else _team2Tens]
            : const [],
        deadwood: const [],
        meldScore: isHaasbagga ? 1000 : (team1Won ? _team1Tens.length * 10 : _team2Tens.length * 10),
        debtScore: 0,
        ginBonus: team1Won ? score.team1Score : score.team2Score,
        netRoundScore: team1Won ? score.team1Score : score.team2Score,
        mode: HolhuashiGameMode.dhihaeh,
        summaryHeadline: headline,
        team1Tens: _team1Tens.length,
        team2Tens: _team2Tens.length,
        team1Tricks: _team1Tricks,
        team2Tricks: _team2Tricks,
      ),
    );
  }

  Future<void> _sweepBondiTrick({
    required int winnerSeat,
    required int token,
  }) async {
    final trickCards = _trickPlays.map((p) => p.card).toList();
    final leadSuit = _currentLeadSuit ?? trickCards.first.suit;
    final wasCut = trickCards.any((c) => c.suit != leadSuit);

    onTrickSweepSound?.call();

    if (!wasCut) {
      // Clean burn -> sweep to Burn Pile
      await _animateTrickSweep(targetPos: _burnPilePos, token: token);
      if (token != _roundToken || !isMounted) return;

      _trickPlays.clear();
      _burnedCards.addAll(trickCards);
      burnedCardsNotifier.value = List.unmodifiable(_burnedCards);
      _layoutBurnPile();

      _seatTricksWon[winnerSeat]++;
      statusMessageNotifier.value =
          'CLEAN BURN (${_burnedCards.length} burned) • ${_seatName(winnerSeat)} leads';
    } else {
      // Bondi Cut -> highest led-suit seat picks up the 4 trick cards
      final pickupPos = _seatAnchor(winnerSeat).pos;
      await _animateTrickSweep(targetPos: pickupPos, token: token);
      if (token != _roundToken || !isMounted) return;

      _trickPlays.clear();
      if (winnerSeat == 0) {
        _seatHands[0].addAll(trickCards.map((c) => c.copyWith(isFaceDown: false)));
        BondiEngine.sortHand(_seatHands[0]);
        currentHand
          ..clear()
          ..addAll(_seatHands[0]);
        _recalculateAnalysisAndLayoutHand();
      } else {
        _seatHands[winnerSeat].addAll(
          trickCards.map((c) => c.copyWith(isFaceDown: true)),
        );
        _layoutFourSeatOpponents();
      }

      statusMessageNotifier.value =
          'BONDI CUT! ${_seatName(winnerSeat)} picks up ${trickCards.length} cards';
    }

    _publishSeats();

    // Check if any player emptied their hand (or safety cap)
    final emptySeat = _seatHands.indexWhere((h) => h.isEmpty);
    if (emptySeat != -1) {
      _finishBondiRound(winnerSeat: emptySeat);
      return;
    }

    int nextLeader = winnerSeat;
    for (int i = 0; i < 4; i++) {
      final candidate = (winnerSeat + i) % 4;
      if (_seatHands[candidate].isNotEmpty) {
        nextLeader = candidate;
        break;
      }
    }

    _startTrick(
      leaderSeat: nextLeader,
      trickNum: _trickNumber + 1,
      token: token,
    );
  }

  void _finishBondiRound({required int winnerSeat}) {
    _setPhase(GameTurnPhase.roundOver);
    final humanWon = winnerSeat == 0;
    final winnerName = _seatName(winnerSeat);
    final headline = humanWon
        ? 'You shed all cards first! (${_burnedCards.length} burned)'
        : '$winnerName shed all cards first!';

    statusMessageNotifier.value = headline;
    onFanfareSound?.call();

    final remainingCount = _seatHands[0].length;
    onRoundCompleted?.call(
      RoundOverData(
        humanWon: humanWon,
        winnerName: winnerName,
        winningMelds: const [],
        deadwood: List.unmodifiable(_seatHands[0]),
        meldScore: _burnedCards.length * 2,
        debtScore: remainingCount * 5,
        ginBonus: humanWon ? 50 : 0,
        netRoundScore: humanWon
            ? 50 + (_burnedCards.length * 2)
            : math.max(10, 40 - remainingCount * 2),
        mode: HolhuashiGameMode.bondi,
        summaryHeadline: headline,
        burnedCards: List.unmodifiable(_burnedCards),
      ),
    );
  }

  Future<void> _animateTrickSweep({
    required Vector2 targetPos,
    required int token,
  }) async {
    final completer = Completer<void>();
    int pending = _trickPlays.length;
    if (pending == 0) return;

    for (final play in _trickPlays) {
      final start = play.comp.position.clone();
      final card = play.card;
      play.comp.removeFromParent();

      gameWorld.add(
        ParabolicDealCardComponent(
          card: card,
          startPos: start,
          endPos: targetPos,
          startSize: tableCardSize,
          cardSize: opponentCardSize * 0.72,
          flightDuration: 0.28 * _speedScale,
          flipOnArrival: false,
          priority: 480,
          onArrived: () {
            pending--;
            if (pending <= 0 && !completer.isCompleted) {
              completer.complete();
            }
          },
        ),
      );
    }

    await completer.future;
    if (token != _roundToken || !isMounted) return;
  }

  DhihaehTrick _buildDhihaehTrick() {
    return DhihaehTrick(
      trickNumber: _trickNumber,
      leadSuit: _currentLeadSuit,
      cards: [
        for (final p in _trickPlays)
          DhihaehTrickCard(card: p.card, playedBySeat: p.seat),
      ],
    );
  }

  BondiTrick _buildBondiTrick() {
    return BondiTrick(
      trickNumber: _trickNumber,
      leadSuit: _currentLeadSuit,
      cards: [
        for (final p in _trickPlays)
          BondiTrickCard(card: p.card, playedBySeat: p.seat),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // HAND & TABLE LAYOUTS
  // ---------------------------------------------------------------------------

  void _updateTrickHandPlayability({required bool forHumanTurn}) {
    if (activeMode == HolhuashiGameMode.digu) {
      for (final comp in handCardComponents) {
        comp.isPlayable = true;
      }
      return;
    }

    final mustPlayAceOfSpades = activeMode == HolhuashiGameMode.bondi &&
        _trickNumber == 1 &&
        _trickPlays.isEmpty &&
        _seatHands[0].any((c) => c.suit == Suit.spades && c.rank == 1);

    for (final comp in handCardComponents) {
      if (!forHumanTurn) {
        comp.isPlayable = true;
      } else if (mustPlayAceOfSpades) {
        comp.isPlayable = comp.card.suit == Suit.spades && comp.card.rank == 1;
      } else if (activeMode == HolhuashiGameMode.dhihaeh) {
        comp.isPlayable = DhihaehValidator.isCardPlayable(
          comp.card,
          _seatHands[0],
          _buildDhihaehTrick(),
        );
      } else {
        comp.isPlayable = BondiValidator.isCardPlayable(
          comp.card,
          _seatHands[0],
          _buildBondiTrick(),
        );
      }
    }
  }

  List<({Vector2 pos, double angle})> _computeSouthFanTargets(int n) {
    if (n <= 0) return const [];
    final cardStepX = n > 10 ? 92.0 : 106.0;
    final totalWidth = ((n - 1) * cardStepX) + handCardSize.x;
    final startX = (virtualWidth / 2) - (totalWidth / 2) + (handCardSize.x / 2);
    const baseY = virtualHeight - 145.0;
    final midIndex = (n - 1) / 2.0;

    return List.generate(n, (i) {
      final distFromMid = (i - midIndex).abs();
      final archDrop = distFromMid * distFromMid * (n > 10 ? 0.8 : 1.1);
      final y = baseY + archDrop;
      final x = startX + (i * cardStepX);
      final angleDeg = (i - midIndex) * (n > 10 ? 0.9 : 1.2);
      return (pos: Vector2(x, y), angle: angleDeg * (math.pi / 180.0));
    });
  }

  List<Vector2> _computeNorthOppTargets(int n) {
    if (n <= 0) return const [];
    const oppY = 72.0;
    const oppStepX = 40.0;
    final totalWidth = ((n - 1) * oppStepX) + opponentCardSize.x;
    final startX =
        (virtualWidth / 2) - (totalWidth / 2) + (opponentCardSize.x / 2);
    return List.generate(n, (i) => Vector2(startX + (i * oppStepX), oppY));
  }

  void _spawnSingleHandCardAt(
    int index,
    PlayingCard card,
    Vector2 pos,
    double angle,
  ) {
    final comp = FlameCardComponent(
      card: card,
      position: pos,
      size: handCardSize,
      restingAngle: angle,
      basePriority: index + 10,
      onTap: _handleCardTap,
      onDragMoved: _handleCardDragMoved,
      onDrop: _handleCardDrop,
    );
    handCardComponents.add(comp);
    gameWorld.add(comp);
  }

  void _spawnSingleNorthCardAt(int index, PlayingCard card, Vector2 pos) {
    final comp = FlameCardComponent(
      card: card.copyWith(isFaceDown: true),
      position: pos,
      size: opponentCardSize,
      isDraggable: false,
      basePriority: index + 1,
    );
    opponentCardComponents.add(comp);
    gameWorld.add(comp);
  }

  void _recalculateAnalysisAndLayoutHand() {
    if (activeMode == HolhuashiGameMode.digu) {
      final analysis = TeamHandOptimizer.optimizeMergedHand(currentHand);
      bool canSlam = analysis.debtScore == 0 && currentHand.length == 10;
      if (!canSlam && currentHand.length == 11) {
        canSlam = currentHand.any(_canCardTriggerGinSlam);
      }

      WidgetsBinding.instance.addPostFrameCallback((_) {
        deadwoodPointsNotifier.value = analysis.debtScore;
        canGinNotifier.value = canSlam;
        handCountNotifier.value = currentHand.length;
      });
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        deadwoodPointsNotifier.value = 0;
        canGinNotifier.value = false;
        handCountNotifier.value = currentHand.length;
      });
    }

    final n = currentHand.length;
    if (n == 0) {
      for (final c in handCardComponents) {
        c.removeFromParent();
      }
      handCardComponents.clear();
      return;
    }

    final targets = _computeSouthFanTargets(n);
    final needsRebuild = handCardComponents.length != n;

    if (needsRebuild) {
      for (final c in handCardComponents) {
        c.removeFromParent();
      }
      handCardComponents.clear();

      for (int i = 0; i < n; i++) {
        final comp = FlameCardComponent(
          card: currentHand[i],
          position: targets[i].pos,
          size: handCardSize,
          restingAngle: targets[i].angle,
          basePriority: i + 10,
          onTap: _handleCardTap,
          onDragMoved: _handleCardDragMoved,
          onDrop: _handleCardDrop,
        );
        handCardComponents.add(comp);
        gameWorld.add(comp);
      }
    }

    for (int i = 0; i < n; i++) {
      final comp = handCardComponents[i];
      comp.card = currentHand[i];
      final isCurSelected = selectedCard == comp;
      final t = targets[i];
      final elevatedPos = Vector2(t.pos.x, t.pos.y - (isCurSelected ? 38.0 : 0.0));

      comp.updateRestingLayout(
        newPos: elevatedPos,
        newAngle: t.angle,
        newPriority: i + 10,
        animated: !needsRebuild,
      );
      comp.setSelected(isCurSelected);
    }

    if (activeMode != HolhuashiGameMode.digu) {
      _updateTrickHandPlayability(forHumanTurn: phase == GameTurnPhase.awaitAction);
    }
  }

  void _handleCardTap(FlameCardComponent tappedComp) {
    if (phase == GameTurnPhase.dealing || phase == GameTurnPhase.roundOver) return;

    if (selectedCard == tappedComp) {
      selectedCard = null;
      hasSelectedCardNotifier.value = false;
      tappedComp.setSelected(false);
    } else {
      selectedCard?.setSelected(false);
      selectedCard = tappedComp;
      hasSelectedCardNotifier.value = true;
      tappedComp.setSelected(true);
    }
    _recalculateAnalysisAndLayoutHand();
  }

  void _handleCardDragMoved(FlameCardComponent comp, Vector2 currentPos) {
    if (phase == GameTurnPhase.dealing || phase == GameTurnPhase.roundOver) {
      return;
    }

    if (currentPos.y >= virtualHeight * 0.65) {
      _tableSurface.clearDropHighlights();
      final n = currentHand.length;
      if (n > 1) {
        final currentIdx = handCardComponents.indexOf(comp);
        if (currentIdx != -1) {
          final targets = _computeSouthFanTargets(n);
          int targetIdx = 0;
          double bestDist = double.infinity;
          for (int i = 0; i < targets.length; i++) {
            final dist = (currentPos.x - targets[i].pos.x).abs();
            if (dist < bestDist) {
              bestDist = dist;
              targetIdx = i;
            }
          }
          targetIdx = targetIdx.clamp(0, n - 1);

          if (targetIdx != currentIdx) {
            final movedCard = currentHand.removeAt(currentIdx);
            currentHand.insert(targetIdx, movedCard);

            final movedComp = handCardComponents.removeAt(currentIdx);
            handCardComponents.insert(targetIdx, movedComp);

            if (activeMode != HolhuashiGameMode.digu &&
                _seatHands[0].length == n) {
              final movedSeatCard = _seatHands[0].removeAt(currentIdx);
              _seatHands[0].insert(targetIdx, movedSeatCard);
            }

            for (int i = 0; i < n; i++) {
              final c = handCardComponents[i];
              final isCurSelected = selectedCard == c;
              final t = targets[i];
              final elevatedPos = Vector2(
                t.pos.x,
                t.pos.y - (isCurSelected ? 38.0 : 0.0),
              );
              c.updateRestingLayout(
                newPos: elevatedPos,
                newAngle: t.angle,
                newPriority: i + 10,
                animated: true,
              );
            }
          }
        }
      }
      return;
    }

    if (phase != GameTurnPhase.awaitAction) {
      _tableSurface.clearDropHighlights();
      return;
    }

    if (activeMode == HolhuashiGameMode.digu) {
      final canSlamThisCard = _canCardTriggerGinSlam(comp.card);
      final inGinZone =
          canSlamThisCard && currentPos.distanceTo(_ginPortalPos) <= 135.0;
      final inDiscardZone =
          !inGinZone &&
          (currentPos.distanceTo(_discardPos) <= 155.0 ||
              currentPos.y < virtualHeight * 0.68);
      _tableSurface.setDropHighlights(
        showDiscardZone: true,
        discardActive: inDiscardZone,
        showGinPortal: canSlamThisCard,
        ginActive: inGinZone,
        showSouthTrickSlot: false,
        trickSlotActive: false,
      );
    } else {
      final inTrickSlot = comp.isPlayable &&
          (currentPos.distanceTo(_trickSlotPos(0)) <= 175.0 ||
              currentPos.y < virtualHeight * 0.68);
      _tableSurface.setDropHighlights(
        showDiscardZone: false,
        discardActive: false,
        showGinPortal: false,
        ginActive: false,
        showSouthTrickSlot: comp.isPlayable,
        trickSlotActive: inTrickSlot,
      );
    }
  }

  void _handleCardDrop(FlameCardComponent comp, Vector2 dropPos) {
    _tableSurface.clearDropHighlights();

    if (dropPos.y >= virtualHeight * 0.65 || phase != GameTurnPhase.awaitAction) {
      comp.springReturnToResting();
      _recalculateAnalysisAndLayoutHand();
      onCardSnapSound?.call();
      return;
    }

    if (activeMode == HolhuashiGameMode.digu) {
      if (dropPos.distanceTo(_ginPortalPos) <= 135.0 &&
          _canCardTriggerGinSlam(comp.card)) {
        unawaited(_executeHumanGinSlamWithCard(comp));
        return;
      }

      const discardThresholdY = virtualHeight * 0.68;
      if (dropPos.distanceTo(_discardPos) <= 155.0 ||
          dropPos.y < discardThresholdY) {
        discardCard(comp);
        return;
      }

      comp.springReturnToResting();
      _recalculateAnalysisAndLayoutHand();
      onCardSnapSound?.call();
      return;
    }

    // Dhihaeh & Bondi magnetic South Trick Slot
    if (comp.isPlayable &&
        (dropPos.distanceTo(_trickSlotPos(0)) <= 175.0 ||
            dropPos.y < virtualHeight * 0.68)) {
      _playHumanTrickCard(comp);
      return;
    }

    comp.springReturnToResting();
    _recalculateAnalysisAndLayoutHand();
    onCardSnapSound?.call();
  }

  void _layoutStockOnly() {
    for (final c in stockComponents) {
      c.removeFromParent();
    }
    stockComponents.clear();

    if (stockPile.isNotEmpty) {
      final layers = math.min(stockPile.length, 3);
      for (int i = 0; i < layers; i++) {
        final offset = (i - (layers - 1)) * 2.0;
        final isTop = i == layers - 1;
        final stockComp = FlameCardComponent(
          card: stockPile.last.copyWith(isFaceDown: true),
          position: Vector2(_stockPos.x + offset, _stockPos.y + offset),
          size: tableCardSize,
          isDraggable: false,
          onTap: isTop ? (_) => drawCardFromStock() : null,
        );
        stockComponents.add(stockComp);
        gameWorld.add(stockComp);
      }
    }
  }

  void _layoutTablePiles() {
    if (activeMode != HolhuashiGameMode.digu) return;

    _layoutStockOnly();

    for (final c in discardComponents) {
      c.removeFromParent();
    }
    discardComponents.clear();

    if (discardPile.isNotEmpty) {
      if (discardPile.length > 2) {
        final under2 = FlameCardComponent(
          card: discardPile[discardPile.length - 3],
          position: Vector2(_discardPos.x + 2, _discardPos.y + 2),
          size: tableCardSize,
          restingAngle: 3.0 * (math.pi / 180.0),
          isDraggable: false,
        );
        discardComponents.add(under2);
        gameWorld.add(under2);
      }

      if (discardPile.length > 1) {
        final under1 = FlameCardComponent(
          card: discardPile[discardPile.length - 2],
          position: Vector2(_discardPos.x - 2, _discardPos.y),
          size: tableCardSize,
          restingAngle: -2.0 * (math.pi / 180.0),
          isDraggable: false,
        );
        discardComponents.add(under1);
        gameWorld.add(under1);
      }

      final topDiscard = FlameCardComponent(
        card: discardPile.last,
        position: _discardPos,
        size: tableCardSize,
        isDraggable: false,
        onTap: (_) => drawCardFromDiscard(),
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

    final targets = _computeNorthOppTargets(botHand.length);
    for (int i = 0; i < botHand.length; i++) {
      _spawnSingleNorthCardAt(i, botHand[i], targets[i]);
    }
  }

  void _rebuildAllFourSeatVisuals() {
    _layoutFourSeatOpponents();
    _recalculateAnalysisAndLayoutHand();
    _publishSeats();
  }

  void _layoutFourSeatOpponents() {
    for (final list in _seatOpponentComponents) {
      for (final c in list) {
        c.removeFromParent();
      }
      list.clear();
    }

    // Seat 2: North (horizontal top fan)
    final northHand = _seatHands[2];
    final northTargets = _computeNorthOppTargets(northHand.length);
    for (int i = 0; i < northHand.length; i++) {
      final comp = FlameCardComponent(
        card: northHand[i].copyWith(isFaceDown: true),
        position: northTargets[i],
        size: opponentCardSize,
        isDraggable: false,
        basePriority: i + 1,
      );
      _seatOpponentComponents[2].add(comp);
      gameWorld.add(comp);
    }

    // Seat 1: East (right vertical fan) & Seat 3: West (left vertical fan)
    for (final seat in [1, 3]) {
      final hand = _seatHands[seat];
      final n = hand.length;
      if (n == 0) continue;

      const stepY = 24.0;
      final totalSpan = (n - 1) * stepY;
      final baseX = seat == 1 ? virtualWidth - 95.0 : 95.0;
      final startY = _tableCenter.y - (totalSpan / 2);
      final angle = seat == 1 ? -math.pi / 2 : math.pi / 2;

      for (int i = 0; i < n; i++) {
        final comp = FlameCardComponent(
          card: hand[i].copyWith(isFaceDown: true),
          position: Vector2(baseX, startY + (i * stepY)),
          size: opponentCardSize * 0.85,
          restingAngle: angle,
          isDraggable: false,
          basePriority: i + 1,
        );
        _seatOpponentComponents[seat].add(comp);
        gameWorld.add(comp);
      }
    }
  }

  void _layoutBurnPile() {
    for (final c in _burnPileComponents) {
      c.removeFromParent();
    }
    _burnPileComponents.clear();

    if (_burnedCards.isEmpty) return;
    final layers = math.min(_burnedCards.length, 3);
    for (int i = 0; i < layers; i++) {
      final comp = FlameCardComponent(
        card: _burnedCards.last.copyWith(isFaceDown: true),
        position: _burnPilePos + Vector2(i * 2.5, i * -2.5),
        size: opponentCardSize * 0.85,
        restingAngle: (i - 1) * 0.06,
        isDraggable: false,
        basePriority: 8 + i,
      );
      _burnPileComponents.add(comp);
      gameWorld.add(comp);
    }
  }

  ({Vector2 pos, double angle}) _seatAnchor(int seat) {
    switch (seat) {
      case 0:
        return (pos: Vector2(virtualWidth / 2, virtualHeight - 145.0), angle: 0.0);
      case 1:
        return (pos: Vector2(virtualWidth - 110.0, _tableCenter.y), angle: -math.pi / 2);
      case 2:
        return (pos: Vector2(virtualWidth / 2, 72.0), angle: 0.0);
      case 3:
      default:
        return (pos: Vector2(110.0, _tableCenter.y), angle: math.pi / 2);
    }
  }

  Vector2 _trickSlotPos(int seat) {
    switch (seat) {
      case 0:
        return Vector2(_tableCenter.x, _tableCenter.y + 115.0);
      case 1:
        return Vector2(_tableCenter.x + 150.0, _tableCenter.y);
      case 2:
        return Vector2(_tableCenter.x, _tableCenter.y - 115.0);
      case 3:
      default:
        return Vector2(_tableCenter.x - 150.0, _tableCenter.y);
    }
  }

  String _seatName(int seat) {
    if (activeMode == HolhuashiGameMode.digu) {
      return seat == 0 ? 'You (South)' : 'North Bot';
    }
    switch (seat) {
      case 0:
        return 'You (South)';
      case 1:
        return 'East AI';
      case 2:
        return activeMode == HolhuashiGameMode.dhihaeh
            ? 'North Partner'
            : 'North AI';
      case 3:
      default:
        return 'West AI';
    }
  }

  void _setPhase(GameTurnPhase next) {
    phase = next;
    phaseNotifier.value = next;
  }

  void _publishSeats() {
    final active = activeSeatNotifier.value;
    if (activeMode == HolhuashiGameMode.digu) {
      seatsNotifier.value = [
        SeatInfo(
          seatIndex: 0,
          name: 'You (South)',
          compassLabel: 'S',
          cardCount: currentHand.length,
          isActiveTurn: active == 0,
        ),
        SeatInfo(
          seatIndex: 2,
          name: 'North Bot',
          compassLabel: 'N',
          cardCount: botHand.length,
          isActiveTurn: active == 2,
        ),
      ];
      return;
    }

    const labels = ['S', 'E', 'N', 'W'];
    seatsNotifier.value = List.generate(4, (i) {
      return SeatInfo(
        seatIndex: i,
        name: _seatName(i),
        compassLabel: labels[i],
        cardCount: _seatHands[i].length,
        isActiveTurn: active == i,
        isPartner: activeMode == HolhuashiGameMode.dhihaeh && (i == 0 || i == 2),
        tricksWon: _seatTricksWon[i],
        capturedTens: _seatTensCaptured[i],
      );
    });
  }
}

class _GinSlamCardComponent extends PositionComponent {
  PlayingCard card;
  final Vector2 startPos;
  final Vector2 endPos;
  final VoidCallback onImpact;

  double _elapsed = 0.0;
  bool _flipped = false;
  bool _impacted = false;

  static const double _totalDuration = 0.34;

  _GinSlamCardComponent({
    required this.card,
    required this.startPos,
    required this.endPos,
    required Vector2 cardSize,
    required this.onImpact,
  }) : super(
          position: startPos.clone(),
          size: cardSize.clone(),
          anchor: Anchor.center,
          priority: 620,
        );

  @override
  void update(double dt) {
    super.update(dt);
    if (_impacted) return;

    _elapsed += dt;
    final t = (_elapsed / _totalDuration).clamp(0.0, 1.0);
    final eased = Curves.easeInOutCubic.transform(t);
    position = startPos + ((endPos - startPos) * eased);

    // Ramp lift up to 1.28x while flipping face-down mid-air
    final liftScale = 1.0 + (0.28 * Curves.easeOutCubic.transform(t));
    if (t < 0.5) {
      final flipP = (t / 0.5).clamp(0.0, 1.0);
      scale = Vector2(
        (liftScale * (1.0 - flipP)).clamp(0.03, 1.28),
        liftScale,
      );
    } else {
      if (!_flipped) {
        _flipped = true;
        card = card.copyWith(isFaceDown: true);
      }
      final flipP = ((t - 0.5) / 0.5).clamp(0.0, 1.0);
      scale = Vector2(
        (liftScale * flipP).clamp(0.03, 1.28),
        liftScale,
      );
    }

    if (t >= 1.0) {
      _impacted = true;
      onImpact();
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);
    final shadowRRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 12, size.x, size.y),
      const Radius.circular(10.0),
    );
    canvas.drawRRect(
      shadowRRect,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.55)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18),
    );
    CardPainter(card: card).paint(canvas, Size(size.x, size.y));
  }
}

class _TableSurfaceComponent extends PositionComponent {
  HolhuashiGameMode activeMode = HolhuashiGameMode.digu;
  Suit? trumpSuit;

  bool _showDiscardZone = false;
  bool _discardActive = false;
  bool _showGinPortal = false;
  bool _ginActive = false;
  bool _showSouthTrickSlot = false;
  bool _trickSlotActive = false;

  _TableSurfaceComponent({required Vector2 size}) : super(size: size);

  void setDropHighlights({
    required bool showDiscardZone,
    required bool discardActive,
    required bool showGinPortal,
    required bool ginActive,
    required bool showSouthTrickSlot,
    required bool trickSlotActive,
  }) {
    _showDiscardZone = showDiscardZone;
    _discardActive = discardActive;
    _showGinPortal = showGinPortal;
    _ginActive = ginActive;
    _showSouthTrickSlot = showSouthTrickSlot;
    _trickSlotActive = trickSlotActive;
  }

  void clearDropHighlights() {
    _showDiscardZone = false;
    _discardActive = false;
    _showGinPortal = false;
    _ginActive = false;
    _showSouthTrickSlot = false;
    _trickSlotActive = false;
  }

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

    final innerRRect =
        RRect.fromRectAndRadius(rect.deflate(24), const Radius.circular(20));
    final goldBorderPaint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.3)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(innerRRect, goldBorderPaint);

    final thinGoldBorder = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.15)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect.deflate(32), const Radius.circular(16)),
      thinGoldBorder,
    );

    const centerX = DiguGameTable.virtualWidth / 2;
    const centerY = DiguGameTable.virtualHeight * 0.42;

    final watermarkCircle = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.05)
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(const Offset(centerX, centerY), 160, watermarkCircle);

    final glyph = activeMode == HolhuashiGameMode.digu
        ? 'ޑ'
        : activeMode == HolhuashiGameMode.dhihaeh
            ? 'ދ'
            : 'ބ';
    final textPainter = TextPainter(
      text: TextSpan(
        text: glyph,
        style: const TextStyle(
          color: Color(0x18D4AF37),
          fontSize: 160,
          fontWeight: FontWeight.w900,
          fontFamily: 'sans-serif',
        ),
      ),
      textDirection: TextDirection.rtl,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(centerX - (textPainter.width / 2), centerY - (textPainter.height / 2)),
    );

    if (activeMode == HolhuashiGameMode.digu) {
      if (_showDiscardZone) {
        _drawDropTargetRect(
          canvas,
          Offset(centerX + 140.0, centerY),
          DiguGameTable.tableCardSize.x + 18,
          DiguGameTable.tableCardSize.y + 18,
          _discardActive ? const Color(0xFFE5C378) : const Color(0x88C84B31),
          active: _discardActive,
        );
      }

      if (_showGinPortal) {
        final portalPaint = Paint()
          ..color = (_ginActive
                  ? const Color(0xFFE5C378)
                  : const Color(0xFFE5C378).withValues(alpha: 0.45))
          ..strokeWidth = _ginActive ? 3.5 : 2.0
          ..style = PaintingStyle.stroke;
        canvas.drawCircle(const Offset(centerX, centerY), 118, portalPaint);
        _drawPileLabel(
          canvas,
          'GIN SLAM PORTAL',
          centerX,
          centerY - 14,
          const Color(0xFFE5C378),
        );
      }
    } else {
      // 4-Seat Trick Slots for Dhihaeh & Bondi
      _drawTrickSlotMarker(canvas, Offset(centerX, centerY + 115.0));
      _drawTrickSlotMarker(canvas, Offset(centerX + 150.0, centerY));
      _drawTrickSlotMarker(canvas, Offset(centerX, centerY - 115.0));
      _drawTrickSlotMarker(canvas, Offset(centerX - 150.0, centerY));

      if (_showSouthTrickSlot) {
        _drawDropTargetRect(
          canvas,
          Offset(centerX, centerY + 115.0),
          DiguGameTable.tableCardSize.x + 20,
          DiguGameTable.tableCardSize.y + 20,
          _trickSlotActive ? const Color(0xFFE5C378) : const Color(0x88E5C378),
          active: _trickSlotActive,
        );
      }

      if (activeMode == HolhuashiGameMode.dhihaeh && trumpSuit != null) {
        _drawPileLabel(
          canvas,
          'TRUMP ${trumpSuit!.symbol}',
          centerX,
          centerY - 10,
          trumpSuit!.isRed ? const Color(0xFFC84B31) : const Color(0xFFE5C378),
        );
      }
    }
  }

  void _drawTrickSlotMarker(Canvas canvas, Offset center) {
    final rect = Rect.fromCenter(
      center: center,
      width: DiguGameTable.tableCardSize.x,
      height: DiguGameTable.tableCardSize.y,
    );
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(10));
    final stroke = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.14)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(rrect, stroke);
  }

  void _drawDropTargetRect(
    Canvas canvas,
    Offset center,
    double w,
    double h,
    Color color, {
    required bool active,
  }) {
    final rect = Rect.fromCenter(center: center, width: w, height: h);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(12));
    if (active) {
      canvas.drawRRect(
        rrect,
        Paint()..color = color.withValues(alpha: 0.18),
      );
    }
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = color
        ..strokeWidth = active ? 3.0 : 1.6
        ..style = PaintingStyle.stroke,
    );
  }

  void _drawPileLabel(
    Canvas canvas,
    String text,
    double x,
    double y,
    Color color,
  ) {
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
}
