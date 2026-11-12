import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/models/card_models.dart';
import 'game/table_canvas.dart';
import 'ui/modals/round_score_modal.dart';
import 'ui/modals/trump_declaration_modal.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  runApp(
    const ProviderScope(
      child: HolhuashiApp(),
    ),
  );
}

class HolhuashiApp extends StatelessWidget {
  const HolhuashiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Holhuashi: Maldivian Rummy & Cards',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0A0D14),
      ),
      home: const GameScreen(),
    );
  }
}

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final DiguGameTable _gameTable;

  HolhuashiGameMode _activeMode = HolhuashiGameMode.digu;
  int _humanCumulativeScore = 0;
  int _botCumulativeScore = 0;

  @override
  void initState() {
    super.initState();
    _gameTable = DiguGameTable();
    _gameTable.onRoundCompleted = _showRoundScoreModal;
  }

  void _showRoundScoreModal(RoundOverData data) {
    setState(() {
      if (data.humanWon) {
        _humanCumulativeScore += data.netRoundScore;
      } else {
        _botCumulativeScore += data.netRoundScore;
      }
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => RoundScoreModal(
        humanWon: data.humanWon,
        winnerName: data.winnerName,
        winningMelds: data.winningMelds,
        deadwood: data.deadwood,
        meldScore: data.meldScore,
        debtScore: data.debtScore,
        ginBonus: data.ginBonus,
        netRoundScore: data.netRoundScore,
        humanCumulativeScore: _humanCumulativeScore,
        botCumulativeScore: _botCumulativeScore,
        onNextRound: () {
          Navigator.of(ctx).pop();
          _gameTable.dealNewRound();
        },
      ),
    );
  }

  void _switchGameMode(HolhuashiGameMode mode) {
    setState(() {
      _activeMode = mode;
    });

    if (mode == HolhuashiGameMode.dhihaeh) {
      _gameTable.dealNewRound();
      // Demonstrate the Trump Declaration Fanfare
      showDialog(
        context: context,
        builder: (ctx) => TrumpDeclarationModal(
          trumpSuit: Suit.spades,
          declarerName: 'Hussain (East AI)',
          onDismiss: () => Navigator.of(ctx).pop(),
        ),
      );
    } else {
      _gameTable.dealNewRound();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. The 60/120 FPS Flame Engine Canvas
          GameWidget<DiguGameTable>.controlled(
            gameFactory: () => _gameTable,
          ),

          // 2. High-Level Flutter Overlay HUD
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
                      // App Brand & Game Mode Selector Tabs
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xF2170B09),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: const Color(0xFFD4AF37).withValues(alpha: 0.5),
                              ),
                            ),
                            child: const Text(
                              'ހޮޅުއަށި',
                              style: TextStyle(
                                color: Color(0xFFD4AF37),
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Mode Tabs: DIGU, DHIHAEH, BONDI
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: const Color(0xE6140705),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFF3B192C)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _buildModeTab('DIGU', HolhuashiGameMode.digu),
                                _buildModeTab('DHIHAEH (10s)', HolhuashiGameMode.dhihaeh),
                                _buildModeTab('BONDI', HolhuashiGameMode.bondi),
                              ],
                            ),
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

                      // Score & Restart Button
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
                          IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: const Color(0xFFD4AF37),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.all(6),
                              minimumSize: const Size(32, 32),
                            ),
                            icon: const Icon(Icons.refresh, size: 18),
                            tooltip: 'Restart Deal',
                            onPressed: () {
                              _gameTable.dealNewRound();
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Floating Hand Status Bar (Clean layout: Sort buttons removed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 120.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Status / Deadwood Meter Pill
                      ValueListenableBuilder<int>(
                        valueListenable: _gameTable.deadwoodPointsNotifier,
                        builder: (context, deadwood, _) {
                          final isZero = deadwood == 0;
                          final isDhihaeh = _activeMode == HolhuashiGameMode.dhihaeh;
                          final isBondi = _activeMode == HolhuashiGameMode.bondi;

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
                      ),
                      const SizedBox(width: 14),

                      // Contextual Gin Slam / Discard Button
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

                              return ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFC84B31),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                ),
                                onPressed: canAct && _gameTable.selectedCard != null
                                    ? () {
                                        _gameTable.discardSelectedCard();
                                      }
                                    : null,
                                child: const Text(
                                  'DISCARD SELECTED',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                                ),
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
        ],
      ),
    );
  }

  Widget _buildModeTab(String title, HolhuashiGameMode mode) {
    final isSelected = _activeMode == mode;
    return GestureDetector(
      onTap: () => _switchGameMode(mode),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFC84B31) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: isSelected ? Border.all(color: const Color(0xFFE5C378), width: 1.0) : null,
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0x99F7F0EA),
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
