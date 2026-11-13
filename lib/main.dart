import 'dart:async';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/audio/sensory_service.dart';
import 'core/models/card_models.dart';
import 'game/table_canvas.dart';
import 'state/game_session_provider.dart';
import 'ui/modals/round_score_modal.dart';
import 'ui/modals/settings_modal.dart';
import 'ui/modals/trump_declaration_modal.dart';
import 'ui/overlays/match_invite_toast.dart';
import 'ui/overlays/quick_chat_overlay.dart';
import 'ui/screens/auth_screen.dart';
import 'ui/screens/lobby_screen.dart';
import 'ui/screens/waiting_room_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  unawaited(SensoryService.instance.init());

  runApp(
    const ProviderScope(
      child: HolhuashiApp(),
    ),
  );
}

class HolhuashiApp extends ConsumerStatefulWidget {
  const HolhuashiApp({super.key});

  @override
  ConsumerState<HolhuashiApp> createState() => _HolhuashiAppState();
}

class _HolhuashiAppState extends ConsumerState<HolhuashiApp>
    with WidgetsBindingObserver {
  AppScreenState? _lastScreenState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(SensoryService.instance.init());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      SensoryService.instance.onAppBackgrounded();
    } else if (state == AppLifecycleState.resumed) {
      SensoryService.instance.onAppForegrounded();
    }
  }

  void _syncBgmForScreen(AppScreenState screen) {
    if (_lastScreenState == screen) return;
    _lastScreenState = screen;

    switch (screen) {
      case AppScreenState.lobby:
      case AppScreenState.waitingRoom:
        SensoryService.instance.playLobbyBgm();
        break;
      case AppScreenState.inGame:
        SensoryService.instance.playTableBgm();
        break;
      case AppScreenState.auth:
        SensoryService.instance.stopBgm();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenState =
        ref.watch(gameSessionProvider.select((s) => s.screenState));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncBgmForScreen(screenState);
    });

    Widget activeView;
    switch (screenState) {
      case AppScreenState.auth:
        activeView = const AuthScreen();
        break;
      case AppScreenState.lobby:
        activeView = const LobbyScreen();
        break;
      case AppScreenState.waitingRoom:
        activeView = const WaitingRoomScreen();
        break;
      case AppScreenState.inGame:
        activeView = const GameScreen();
        break;
    }

    return Listener(
      onPointerDown: (_) => SensoryService.instance.tryUnlockWebAudio(),
      child: MaterialApp(
        title: 'Holhuashi: Maldivian Rummy & Cards',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF0A0D14),
        ),
        home: Stack(
          children: [
            activeView,
            const MatchInviteToast(),
          ],
        ),
      ),
    );
  }
}

class GameScreen extends ConsumerStatefulWidget {
  const GameScreen({super.key});

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  late final DiguGameTable _gameTable;
  int _humanCumulativeScore = 0;
  int _botCumulativeScore = 0;
  bool _showCountdown = true;

  @override
  void initState() {
    super.initState();
    _gameTable = DiguGameTable(autoDealOnLoad: false);

    // Bind Lifecycle & Sensory Callbacks
    _gameTable.onRoundCompleted = _showRoundScoreModal;
    _gameTable.onRequestTrumpDeclaration = _handleTrumpDeclaration;

    final sensory = ref.read(sensoryServiceProvider);
    _gameTable.onShuffleSound = sensory.playShuffle;
    _gameTable.onCardDealSound = sensory.playCardDeal;
    _gameTable.onCardSnapSound = sensory.playCardSnap;
    _gameTable.onTrickSweepSound = sensory.playTrickSweep;
    _gameTable.onGinSlamSound = sensory.playGinSlam;
    _gameTable.onFanfareSound = sensory.playFanfare;

    // Additional sensory & table interaction callbacks
    _gameTable.onCardSelectHaptic = sensory.playCardSelect;
    _gameTable.onFanReorderTickSound = sensory.playFanReorderTick;
    _gameTable.onDiscardPickupSound = sensory.playDiscardPickup;
    _gameTable.onCardDiscardSound = sensory.playCardDiscard;
    _gameTable.onGinReadyChimeSound = sensory.playGinReadyChime;

    // Apply sensory settings
    final session = ref.read(gameSessionProvider);
    _gameTable.updateSettings(
      screenShakeEnabled: session.screenShakeEnabled,
      fastDealSpeed: session.fastDealSpeed,
    );

    // Initial mode & rules sync (cards wait behind countdown before dealing)
    if (_gameTable.activeMode != session.selectedMode) {
      _gameTable.setInitialMode(session.selectedMode);
    }
    _gameTable.configureRules(
      diguFormat: session.diguFormat,
      bondiVariant: session.bondiVariant,
      dhihaehVariant: session.dhihaehVariant,
      targetScore: session.targetScore,
    );
  }

  Future<Suit> _handleTrumpDeclaration(
    List<PlayingCard> pass1Hand,
    int declarerSeat,
  ) async {
    final completer = Completer<Suit>();
    if (!mounted) return Suit.spades;

    final isHuman = declarerSeat == 0;
    final declarerName = isHuman ? 'You (South)' : 'East AI';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => TrumpDeclarationModal(
        isHumanDeclarer: isHuman,
        declarerName: declarerName,
        pass1Cards: pass1Hand,
        onSuitSelected: (suit) {
          Navigator.of(ctx).pop();
          if (!completer.isCompleted) completer.complete(suit);
        },
        onDismiss: () {
          Navigator.of(ctx).pop();
          if (!completer.isCompleted) completer.complete(Suit.spades);
        },
      ),
    );

    return completer.future;
  }

  void _showRoundScoreModal(RoundOverData data) {
    final notifier = ref.read(gameSessionProvider.notifier);

    setState(() {
      if (data.humanRoundScore != 0 || data.opponentRoundScore != 0) {
        _humanCumulativeScore += data.humanRoundScore;
        _botCumulativeScore += data.opponentRoundScore;
      } else if (data.humanWon) {
        _humanCumulativeScore += data.netRoundScore;
      } else {
        _botCumulativeScore += data.netRoundScore;
      }
    });

    notifier.recordMatchResult(
      mode: data.mode,
      humanWon: data.humanWon,
      humanScore: _humanCumulativeScore,
      opponentScore: _botCumulativeScore,
    );

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => RoundScoreModal.fromRoundData(
        data: data,
        humanCumulativeScore: _humanCumulativeScore,
        botCumulativeScore: _botCumulativeScore,
        onNextRound: () {
          Navigator.of(ctx).pop();
          _gameTable.dealNewRound();
        },
        onReturnToLobby: () {
          Navigator.of(ctx).pop();
          notifier.goToLobby();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);

    // Keep settings & rules in sync
    _gameTable.updateSettings(
      screenShakeEnabled: session.screenShakeEnabled,
      fastDealSpeed: session.fastDealSpeed,
    );
    _gameTable.configureRules(
      diguFormat: session.diguFormat,
      bondiVariant: session.bondiVariant,
      dhihaehVariant: session.dhihaehVariant,
      targetScore: session.targetScore,
    );

    return Scaffold(
      body: Stack(
        children: [
          // 1. The 60/120 FPS Real-Time Tabletop Canvas
          GameWidget<DiguGameTable>.controlled(
            gameFactory: () => _gameTable,
          ),

          // 2. 4-Seat Compass Placards on Table Edges
          ValueListenableBuilder<List<SeatInfo>>(
            valueListenable: _gameTable.seatsNotifier,
            builder: (context, seats, _) {
              final seatMap = {for (final s in seats) s.seatIndex: s};
              final east = seatMap[1];
              final north = seatMap[2];
              final west = seatMap[3];

              return Stack(
                children: [
                  // North Placard (Top Center)
                  if (north != null)
                    Align(
                      alignment: const Alignment(0.0, -0.72),
                      child: _buildSeatPlacard(north),
                    ),

                  // East Placard + Right-Side Empty Stock Shuffle Action
                  Align(
                    alignment: const Alignment(0.92, 0.04),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (east != null) _buildSeatPlacard(east),
                        _buildRightSideEmptyStockShuffleButton(
                          topPadding: east != null ? 10 : 0,
                        ),
                      ],
                    ),
                  ),

                  // West Placard (Left Center)
                  if (west != null)
                    Align(
                      alignment: const Alignment(-0.92, -0.05),
                      child: _buildSeatPlacard(west),
                    ),
                ],
              );
            },
          ),

          // 3. High-Level Flutter Overlay HUD
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Header Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Back to Lobby + Brand + Game Mode Tabs
                      Row(
                        children: [
                          IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: const Color(0xF21C0A0D),
                              foregroundColor: const Color(0xFFD4AF37),
                              side: const BorderSide(color: Color(0xFFD4AF37), width: 1.0),
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(32, 32),
                            ),
                            icon: const Icon(Icons.arrow_back, size: 16),
                            tooltip: 'Return to Lobby',
                            onPressed: () => notifier.goToLobby(),
                          ),
                          const SizedBox(width: 8),

                          // Brand Mark
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xF2170B09),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: const Color(0xFFD4AF37).withValues(alpha: 0.6),
                              ),
                            ),
                            child: const Text(
                              'ހޮޅުއަށި',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                color: Color(0xFFD4AF37),
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Active Mode Badge
                          ValueListenableBuilder<HolhuashiGameMode>(
                            valueListenable: _gameTable.activeModeNotifier,
                            builder: (context, activeMode, _) {
                              final modeLabel = switch (activeMode) {
                                HolhuashiGameMode.digu => 'ޑިގު • DIGU',
                                HolhuashiGameMode.dhihaeh => 'ދިހައެއް • DHIHAEH',
                                HolhuashiGameMode.bondi => 'ބޮނޑި • BONDI',
                              };
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xE61C0A0D),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFFD4AF37).withValues(alpha: 0.7),
                                  ),
                                ),
                                child: Text(
                                  modeLabel,
                                  style: const TextStyle(
                                    color: Color(0xFFE5C378),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),

                      // Turn State Message Banner
                      Flexible(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0),
                          child: ValueListenableBuilder<String>(
                            valueListenable: _gameTable.statusMessageNotifier,
                            builder: (context, msg, _) {
                              return ValueListenableBuilder<GameTurnPhase>(
                                valueListenable: _gameTable.phaseNotifier,
                                builder: (context, phase, _) {
                                  final isBot = phase == GameTurnPhase.botThinking;
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: isBot ? const Color(0xCC301A14) : const Color(0xCC0D0605),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: isBot ? const Color(0xFFC84B31) : const Color(0xFFE5C378),
                                      ),
                                    ),
                                    child: Text(
                                      msg,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: isBot ? const Color(0xFFFFA07A) : const Color(0xFFE5C378),
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                          ),
                        ),
                      ),

                      // Score, Shuffle & Deal, and Settings Buttons
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xCC0D0605),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFF301A14)),
                            ),
                            child: Text(
                              'YOU: $_humanCumulativeScore  BOT: $_botCumulativeScore',
                              style: const TextStyle(
                                color: Color(0xFFE5C378),
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Shuffle & Deal Button
                          IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: const Color(0xFFD4AF37),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(32, 32),
                            ),
                            icon: const Icon(Icons.shuffle, size: 18),
                            tooltip: 'Shuffle & Deal Round',
                            onPressed: () {
                              _gameTable.dealNewRound();
                            },
                          ),
                          const SizedBox(width: 6),

                          // Settings Button
                          IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: const Color(0xFF260A0D),
                              foregroundColor: const Color(0xFFF7F0EA),
                              side: const BorderSide(color: Color(0xFF380C10), width: 1.0),
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(32, 32),
                            ),
                            icon: const Icon(Icons.settings, size: 18),
                            tooltip: 'Settings',
                            onPressed: () => SettingsModal.show(context),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Floating Hand Status Bar & Actions (Clean layout: NO sort buttons)
                Padding(
                  padding: const EdgeInsets.only(bottom: 120.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Status / Deadwood / 10s Meter Pill
                      ValueListenableBuilder<HolhuashiGameMode>(
                        valueListenable: _gameTable.activeModeNotifier,
                        builder: (context, activeMode, _) {
                          return ValueListenableBuilder<int>(
                            valueListenable: _gameTable.deadwoodPointsNotifier,
                            builder: (context, deadwood, _) {
                              final isZero = deadwood == 0;
                              final isDhihaeh = activeMode == HolhuashiGameMode.dhihaeh;
                              final isBondi = activeMode == HolhuashiGameMode.bondi;

                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xF2170B09),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(
                                    color: isZero ? const Color(0xFFE5C378) : const Color(0xFF301A14),
                                  ),
                                  boxShadow: isZero
                                      ? [
                                          const BoxShadow(
                                            color: Color(0x66E5C378),
                                            blurRadius: 15,
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      isDhihaeh
                                          ? 'TRUMP: ♠ SPADES • 10s: '
                                          : isBondi
                                              ? 'SHED CARDS: '
                                              : 'DEADWOOD ',
                                      style: const TextStyle(
                                        color: Color(0xB2F7F0EA),
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w900,
                                        fontFamily: 'monospace',
                                        letterSpacing: 1.0,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isZero ? const Color(0xFF301A14) : const Color(0xFF0D0605),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(
                                          color: isZero ? const Color(0xFFE5C378) : const Color(0xFF301A14),
                                        ),
                                      ),
                                      child: Text(
                                        isDhihaeh
                                            ? '0 / 4'
                                            : isBondi
                                                ? 'ACTIVE'
                                                : '$deadwood / 10',
                                        style: TextStyle(
                                          color: isZero ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w900,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          );
                        },
                      ),
                      const SizedBox(width: 14),

                      // Contextual Action Button: SLAM GIN! or DISCARD / PLAY
                      ValueListenableBuilder<GameTurnPhase>(
                        valueListenable: _gameTable.phaseNotifier,
                        builder: (context, phase, _) {
                          final canAct = phase == GameTurnPhase.awaitAction;
                          return ValueListenableBuilder<bool>(
                            valueListenable: _gameTable.canGinNotifier,
                            builder: (context, canGin, _) {
                              if (canGin) {
                                return ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFE5C378),
                                    foregroundColor: Colors.black,
                                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    elevation: 6,
                                  ),
                                  onPressed: () {
                                    _gameTable.declareGinSlam();
                                  },
                                  icon: const Icon(Icons.flash_on, size: 16),
                                  label: const Text(
                                    'SLAM GIN!',
                                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                                  ),
                                );
                              }

                              return ValueListenableBuilder<bool>(
                                valueListenable: _gameTable.hasSelectedCardNotifier,
                                builder: (context, hasSelected, _) {
                                  return ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFC84B31),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                    ),
                                    onPressed: canAct && hasSelected
                                        ? () {
                                            _gameTable.playSelectedCard();
                                          }
                                        : null,
                                    child: const Text(
                                      'DISCARD / PLAY',
                                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                                    ),
                                  );
                                },
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 4. Floating Quick-Chat Overlay (Maldivian Thaana/Latin + Speech Bubbles)
          const QuickChatOverlay(),

          // 5. Match Start 3-2-1 Countdown Overlay
          if (_showCountdown)
            _MatchStartCountdown(
              onComplete: () {
                if (mounted && _showCountdown) {
                  setState(() {
                    _showCountdown = false;
                  });
                  _gameTable.dealNewRound();
                }
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSeatPlacard(SeatInfo seat) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: seat.isActiveTurn ? const Color(0xEE2A0E12) : const Color(0xD9140607),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: seat.isActiveTurn ? const Color(0xFFD4AF37) : const Color(0xFF380C10),
          width: seat.isActiveTurn ? 1.6 : 0.9,
        ),
        boxShadow: seat.isActiveTurn
            ? [
                BoxShadow(
                  color: const Color(0xFFD4AF37).withValues(alpha: 0.35),
                  blurRadius: 10,
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            decoration: BoxDecoration(
              color: seat.isActiveTurn ? const Color(0xFFD4AF37) : const Color(0xFF260A0D),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              seat.compassLabel,
              style: TextStyle(
                color: seat.isActiveTurn ? const Color(0xFF0D0605) : const Color(0xFFE5C378),
                fontSize: 9,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            seat.name,
            style: const TextStyle(
              color: Color(0xFFF7F0EA),
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '• ${seat.cardCount}c',
            style: const TextStyle(
              color: Color(0x99F7F0EA),
              fontSize: 9.5,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  /// Renders the explicit right-side "Shuffle & Draw" control in Digu when
  /// the stock pile hits 0 cards on the player's draw turn, allowing them to
  /// choose between taking the top discard or shuffling remaining discards.
  Widget _buildRightSideEmptyStockShuffleButton({double topPadding = 0}) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _gameTable.activeModeNotifier,
        _gameTable.phaseNotifier,
        _gameTable.stockCountNotifier,
        _gameTable.discardCountNotifier,
      ]),
      builder: (context, _) {
        final shouldShow =
            _gameTable.activeModeNotifier.value == HolhuashiGameMode.digu &&
            _gameTable.phaseNotifier.value == GameTurnPhase.awaitDraw &&
            _gameTable.stockCountNotifier.value == 0 &&
            _gameTable.discardCountNotifier.value > 1;
        if (!shouldShow) {
          return const SizedBox.shrink();
        }
        return Padding(
          padding: EdgeInsets.only(top: topPadding),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              key: const Key('btn_empty_stock_shuffle'),
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                SensoryService.instance.playButtonTap();
                _gameTable.shuffleDiscardAndDrawStock();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFF3A1418), Color(0xFF1E090B)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: const Color(0xFFE5C378),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFD4AF37).withValues(alpha: 0.28),
                      blurRadius: 14,
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.shuffle_rounded,
                      color: Color(0xFFE5C378),
                      size: 16,
                    ),
                    SizedBox(width: 7),
                    Text(
                      'Shuffle & Draw',
                      style: TextStyle(
                        color: Color(0xFFF7F0EA),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// 3-2-1 Dramatic Match Start Overlay.
class _MatchStartCountdown extends StatefulWidget {
  final VoidCallback onComplete;

  const _MatchStartCountdown({required this.onComplete});

  @override
  State<_MatchStartCountdown> createState() => _MatchStartCountdownState();
}

class _MatchStartCountdownState extends State<_MatchStartCountdown> {
  int _count = 3;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 650), (t) {
      if (!mounted) return;
      if (_count > 1) {
        setState(() {
          _count--;
        });
      } else {
        t.cancel();
        Future.delayed(const Duration(milliseconds: 350), () {
          if (mounted) widget.onComplete();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: GestureDetector(
        onTap: widget.onComplete,
        behavior: HitTestBehavior.opaque,
        child: Container(
          color: Colors.black.withValues(alpha: 0.40),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                child: Text(
                  '$_count',
                  key: ValueKey<int>(_count),
                  style: const TextStyle(
                    fontSize: 72,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFD4AF37),
                    shadows: [
                      Shadow(
                        color: Color(0xFFD4AF37),
                        blurRadius: 30,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'ފަށާ • START!',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFF7F0EA),
                  letterSpacing: 2.0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
