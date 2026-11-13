import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/game_session_provider.dart';
import '../modals/settings_modal.dart';

/// Main Holhuashi Lobby & Game Mode Selection Screen.
///
/// Designed with authentic Maldivian Rosewood and Gold lacquer aesthetic:
/// Deep lacquered rosewood (#0D0605, #1B0709, #380C10), antique gold foil (#D4AF37, #E5C378),
/// and crimson lacquer accents (#C84B31).
class LobbyScreen extends ConsumerWidget {
  const LobbyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);

    return Scaffold(
      backgroundColor: const Color(0xFF0D0605),
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.25,
            colors: [
              Color(0xFF260A0D),
              Color(0xFF140506),
              Color(0xFF0D0405),
              Color(0xFF070202),
            ],
            stops: [0.0, 0.45, 0.8, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 1. Top Navigation & Identity Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Brand Mark: Thaana + English
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xF21C0A0D),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(0xFFD4AF37),
                              width: 1.4,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFD4AF37).withValues(alpha: 0.25),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                          child: Row(
                            children: const [
                              Text(
                                'ހޮޅުއަށި',
                                textDirection: TextDirection.rtl,
                                style: TextStyle(
                                  color: Color(0xFFD4AF37),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              SizedBox(width: 8),
                              Text(
                                '• HOLHUASHI',
                                style: TextStyle(
                                  color: Color(0xFFF7F0EA),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Right Actions: Profile & Coins Pill, Private Table, Settings
                    Row(
                      children: [
                        // Profile & Coins Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xF2170809),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF380C10)),
                          ),
                          child: Row(
                            children: [
                              const CircleAvatar(
                                radius: 11,
                                backgroundColor: Color(0xFFD4AF37),
                                child: Icon(Icons.person, size: 14, color: Color(0xFF0D0605)),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                session.displayName,
                                style: const TextStyle(
                                  color: Color(0xFFF7F0EA),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0D0405),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFD4AF37).withValues(alpha: 0.4)),
                                ),
                                child: Row(
                                  children: [
                                    const Text('🪙', style: TextStyle(fontSize: 11)),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${session.coins}',
                                      style: const TextStyle(
                                        color: Color(0xFFE5C378),
                                        fontWeight: FontWeight.w900,
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Private Table Button
                        IconButton.filled(
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF260A0D),
                            foregroundColor: const Color(0xFFD4AF37),
                            side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                            minimumSize: const Size(38, 38),
                          ),
                          icon: const Icon(Icons.vpn_key_rounded, size: 18),
                          tooltip: 'Private Table / Room Code',
                          onPressed: () => notifier.openWaitingRoom(),
                        ),
                        const SizedBox(width: 8),

                        // Settings Button
                        IconButton.filled(
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF260A0D),
                            foregroundColor: const Color(0xFFF7F0EA),
                            side: const BorderSide(color: Color(0xFF380C10), width: 1.2),
                            minimumSize: const Size(38, 38),
                          ),
                          icon: const Icon(Icons.settings, size: 18),
                          tooltip: 'Settings & Sensory Options',
                          onPressed: () => SettingsModal.show(context),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 2. Mode Selection: 3 Interactive Cards
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 6.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Mode 1: DIGU (Maldivian Rummy)
                      Expanded(
                        child: _buildModeCard(
                          context: context,
                          mode: HolhuashiGameMode.digu,
                          thaanaTitle: 'ދިގު',
                          englishTitle: 'DIGU',
                          subtitle: 'Authentic 10-Card Maldivian Rummy',
                          elo: session.diguElo,
                          isSelected: session.selectedMode == HolhuashiGameMode.digu,
                          onTap: () => notifier.selectGameMode(HolhuashiGameMode.digu),
                          iconBadge: '🎴',
                          bullets: const [
                            '10-Card Rummy with Ace-restricted runs',
                            '1,000-Point 7-card runs & backtracking',
                            'DEADWOOD penalty & Gin Slam declaration',
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Mode 2: DHIHAEH (10s)
                      Expanded(
                        child: _buildModeCard(
                          context: context,
                          mode: HolhuashiGameMode.dhihaeh,
                          thaanaTitle: 'ދިހައެއް',
                          englishTitle: 'DHIHAEH (10s)',
                          subtitle: '4-Player 2v2 Maldivian Trump Capture',
                          elo: session.dhihaehElo,
                          isSelected: session.selectedMode == HolhuashiGameMode.dhihaeh,
                          onTap: () => notifier.selectGameMode(HolhuashiGameMode.dhihaeh),
                          iconBadge: '🔟',
                          bullets: const [
                            '4-Player 2v2 Partnership (South + North)',
                            '5-4-4 batch deal & first 5-card trump call',
                            'Capture 10s: Haasbagga (1,000 pts) / Bagga (4 pts)',
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Mode 3: BONDI
                      Expanded(
                        child: _buildModeCard(
                          context: context,
                          mode: HolhuashiGameMode.bondi,
                          thaanaTitle: 'ބޮނޑި',
                          englishTitle: 'BONDI',
                          subtitle: 'Fast-Paced Trick Shed & Burn-Pile Sweeper',
                          elo: session.bondiElo,
                          isSelected: session.selectedMode == HolhuashiGameMode.bondi,
                          onTap: () => notifier.selectGameMode(HolhuashiGameMode.bondi),
                          iconBadge: '🔥',
                          bullets: const [
                            '52-Card full table deal across 4 seats',
                            'Mandatory ♠A lead on trick 1',
                            'Must beat the lead suit or pick up the burn pile',
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Bottom Launch Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xF2160708),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFF380C10), width: 1.4),
                  ),
                  child: Row(
                    children: [
                      // Quick info indicator
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF00E676),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'ONLINE: ${session.selectedMode.name.toUpperCase()} SERVERS READY',
                            style: const TextStyle(
                              color: Color(0xB3F7F0EA),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),

                      // Action 1: Create / Join Private Room
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                          foregroundColor: const Color(0xFFE5C378),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(Icons.group_add, size: 16),
                        label: const Text(
                          'PRIVATE TABLE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                        ),
                        onPressed: () => notifier.goToWaitingRoom(
                          mode: session.selectedMode,
                          isPrivate: true,
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Action 2: Play Solo vs Bots
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFC84B31),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(Icons.smart_toy, size: 16),
                        label: const Text(
                          'PLAY SOLO VS BOTS',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                          ),
                        ),
                        onPressed: () => notifier.startSoloMatch(session.selectedMode),
                      ),
                      const SizedBox(width: 10),

                      // Action 3: Online Matchmaking (Primary Prominent Gold Button)
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD4AF37),
                          foregroundColor: const Color(0xFF0D0605),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 6,
                          shadowColor: const Color(0xFFD4AF37).withValues(alpha: 0.5),
                        ),
                        icon: const Icon(Icons.bolt, size: 17),
                        label: const Text(
                          'ONLINE MATCHMAKING',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                        onPressed: () => notifier.startOnlineMatchmaking(session.selectedMode),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeCard({
    required BuildContext context,
    required HolhuashiGameMode mode,
    required String thaanaTitle,
    required String englishTitle,
    required String subtitle,
    required int elo,
    required bool isSelected,
    required VoidCallback onTap,
    required String iconBadge,
    required List<String> bullets,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isSelected
                ? [
                    const Color(0xFF3B1015),
                    const Color(0xFF23090B),
                    const Color(0xFF140506),
                  ]
                : [
                    const Color(0xFF1B0709),
                    const Color(0xFF110405),
                    const Color(0xFF0D0304),
                  ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFF380C10),
            width: isSelected ? 2.0 : 1.2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFD4AF37).withValues(alpha: 0.35),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                  const BoxShadow(
                    color: Colors.black87,
                    blurRadius: 16,
                    offset: Offset(0, 8),
                  ),
                ]
              : [
                  const BoxShadow(
                    color: Colors.black54,
                    blurRadius: 8,
                    offset: Offset(0, 4),
                  ),
                ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Emoji Icon + ELO Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D0405),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFFD4AF37)
                          : const Color(0xFF380C10),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(iconBadge, style: const TextStyle(fontSize: 18)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFD4AF37)
                        : const Color(0xFF260A0D),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFFE5C378)
                          : const Color(0xFF380C10),
                    ),
                  ),
                  child: Text(
                    'ELO $elo',
                    style: TextStyle(
                      color: isSelected ? const Color(0xFF0D0605) : const Color(0xFFE5C378),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Thaana & English Mode Title
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  thaanaTitle,
                  textDirection: TextDirection.rtl,
                  style: TextStyle(
                    color: isSelected ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  englishTitle,
                  style: TextStyle(
                    color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFFF7F0EA),
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),

            // Subtitle
            Text(
              subtitle,
              style: const TextStyle(
                color: Color(0x99F7F0EA),
                fontSize: 10.5,
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(height: 10),
            Divider(
              color: isSelected ? const Color(0xFFD4AF37).withValues(alpha: 0.4) : const Color(0xFF380C10),
              height: 12,
            ),

            // Bullets
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: bullets.map((b) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 3.0),
                        child: Icon(
                          Icons.play_arrow,
                          size: 11,
                          color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFFC84B31),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          b,
                          style: const TextStyle(
                            color: Color(0xCCF7F0EA),
                            fontSize: 10.5,
                            height: 1.25,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),

            // Card Footer Indicator
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFFD4AF37).withValues(alpha: 0.18)
                    : const Color(0xFF0D0405),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? const Color(0xFFD4AF37) : Colors.transparent,
                  width: 0.8,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                isSelected ? 'SELECTED MODE ✓' : 'TAP TO SELECT',
                style: TextStyle(
                  color: isSelected ? const Color(0xFFE5C378) : const Color(0x66F7F0EA),
                  fontSize: 9.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
