import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'game/table_canvas.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force Landscape Orientation for optimal Maldivian card table ergonomics
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Immersive Edge-to-Edge display
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

  @override
  void initState() {
    super.initState();
    _gameTable = DiguGameTable();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. 120 FPS Flame Engine Canvas (Table, Fanned Hand, Stock & Discard)
          GameWidget<DiguGameTable>.controlled(
            gameFactory: () => _gameTable,
          ),

          // 2. High-Level Flutter Overlay HUD
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // App Title & Mode Indicator
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xF2170B09),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFD4AF37).withValues(alpha: 0.5),
                          ),
                        ),
                        child: const Row(
                          children: [
                            Text(
                              'ހޮޅުއަށި',
                              style: TextStyle(
                                color: Color(0xFFD4AF37),
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            SizedBox(width: 8),
                            Text(
                              '| Digu (Solo 2P)',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Actions: Deal New Hand / Sound / Instructions
                      Row(
                        children: [
                          IconButton.filled(
                            style: IconButton.styleFrom(
                              backgroundColor: const Color(0xFFD4AF37),
                              foregroundColor: Colors.black,
                            ),
                            icon: const Icon(Icons.refresh, size: 20),
                            tooltip: 'Deal New Hand',
                            onPressed: () {
                              _gameTable.dealNewRound();
                            },
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black.withValues(alpha: 0.5),
                              foregroundColor: Colors.white70,
                            ),
                            icon: const Icon(Icons.volume_up, size: 20),
                            tooltip: 'Sound',
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Floating Over-Hand HUD (Deadwood Meter & Gin Indicator)
                Padding(
                  padding: const EdgeInsets.only(bottom: 120.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Deadwood Pill (Replicating live style)
                      ValueListenableBuilder<int>(
                        valueListenable: _gameTable.deadwoodPointsNotifier,
                        builder: (context, deadwood, _) {
                          final isZero = deadwood == 0;
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
                                const Text(
                                  'DEADWOOD ',
                                  style: TextStyle(
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
                                    '$deadwood / 10',
                                    style: TextStyle(
                                      color: isZero ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                                ValueListenableBuilder<bool>(
                                  valueListenable: _gameTable.canGinNotifier,
                                  builder: (context, canGin, _) {
                                    if (!canGin) return const SizedBox.shrink();
                                    return Padding(
                                      padding: const EdgeInsets.only(left: 8.0),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF301A14),
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: const Color(0xFFE5C378)),
                                        ),
                                        child: const Text(
                                          '⚡ GIN READY',
                                          style: TextStyle(
                                            color: Color(0xFFE5C378),
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            fontFamily: 'monospace',
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
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
}
