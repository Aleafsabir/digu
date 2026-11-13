import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/audio/sensory_service.dart';
import '../../core/services/update_service.dart';
import '../../state/game_session_provider.dart';
import '../modals/settings_modal.dart';
import '../modals/update_prompt_modal.dart';

/// Main Holhuashi Lobby Screen reworked for Minimum Taps.
///
/// Features:
/// - Fast Re-Entry Pill (1-Tap Quick Play routing to 15s Ready-Check Gate).
/// - Interactive Profile & Cloud Sync Capsule (Cloud Save Synced vs Device Save Only).
/// - 3-Column Minimum-Tap Hero Mode Cards with in-card Play Solo & Private Table actions.
/// - Sleek dismissible matchmaking notifications banner.
/// - Automatic, non-blocking check for application updates on launch.
class LobbyScreen extends ConsumerStatefulWidget {
  final UpdateService? updateService;

  const LobbyScreen({
    super.key,
    this.updateService,
  });

  @override
  ConsumerState<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends ConsumerState<LobbyScreen> {
  bool _hasCheckedForUpdates = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_hasCheckedForUpdates && mounted) {
        _hasCheckedForUpdates = true;
        _checkForAppUpdates();
      }
    });
  }

  Future<void> _checkForAppUpdates() async {
    try {
      final service = widget.updateService ?? UpdateService();
      final info = await service.checkForUpdate();
      if (info != null && mounted) {
        await UpdatePromptModal.show(context, updateInfo: info, updateService: service);
      }
    } catch (_) {
      // Non-blocking guard for test environments and offline boots
    }
  }

  @override
  Widget build(BuildContext context) {
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
              // 1. Top Navigation Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Row(
                  children: [
                    // Brand Mark: Thaana + English
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                            blurRadius: 10,
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Text(
                            'ހޮޅުއަށި',
                            textDirection: TextDirection.rtl,
                            style: TextStyle(
                              color: Color(0xFFD4AF37),
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                              letterSpacing: 0.5,
                            ),
                          ),
                          SizedBox(width: 6),
                          Text(
                            '• HOLHUASHI',
                            style: TextStyle(
                              color: Color(0xFFF7F0EA),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Fast Re-Entry Pill (1 TAP Quick Play through Ready Gate)
                    InkWell(
                      key: const Key('btn_quick_play'),
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        SensoryService.instance.playButtonTap();
                        SensoryService.instance.tryUnlockWebAudio();
                        notifier.enterMatchmaking(session.lastPlayedMode);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFC84B31), Color(0xFF8B1E2B)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFE5C378),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFC84B31).withValues(alpha: 0.35),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '⚡ Quick Play: ${session.lastPlayedMode.name.toUpperCase()}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD4AF37),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                '1 TAP',
                                style: TextStyle(
                                  color: Color(0xFF0D0605),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 9,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const Spacer(),

                    // Interactive Profile & Cloud Sync Capsule
                    InkWell(
                      key: const Key('btn_profile_sync'),
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        SensoryService.instance.playButtonTap();
                        _showCloudSyncModal(context, session, notifier);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xF2170809),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: session.isCloudSynced
                                ? const Color(0xFF81C784)
                                : const Color(0xFF380C10),
                            width: session.isCloudSynced ? 1.4 : 1.0,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircleAvatar(
                              radius: 11,
                              backgroundColor: session.isCloudSynced
                                  ? const Color(0xFF2E7D32)
                                  : const Color(0xFFD4AF37),
                              child: Text(
                                session.displayName.isNotEmpty
                                    ? session.displayName.substring(0, 1).toUpperCase()
                                    : 'R',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  color: session.isCloudSynced
                                      ? Colors.white
                                      : const Color(0xFF0D0605),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  session.displayName,
                                  style: const TextStyle(
                                    color: Color(0xFFF7F0EA),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  session.authStatusLabel,
                                  style: TextStyle(
                                    color: session.isCloudSynced
                                        ? const Color(0xFF81C784)
                                        : const Color(0xFFD4AF37),
                                    fontWeight: FontWeight.w700,
                                    fontSize: 8.5,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 8),
                            // Coins pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D0405),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: const Color(0xFFD4AF37).withValues(alpha: 0.4),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Text('🪙', style: TextStyle(fontSize: 10)),
                                  const SizedBox(width: 3),
                                  Text(
                                    '${session.coins}',
                                    style: const TextStyle(
                                      color: Color(0xFFE5C378),
                                      fontWeight: FontWeight.w900,
                                      fontSize: 10.5,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Private Table Button
                    IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFF260A0D),
                        foregroundColor: const Color(0xFFD4AF37),
                        side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                        minimumSize: const Size(36, 36),
                      ),
                      icon: const Icon(Icons.vpn_key_rounded, size: 16),
                      tooltip: 'Private Table',
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        SensoryService.instance.tryUnlockWebAudio();
                        notifier.enterMatchmaking(session.selectedMode, isPrivateRoom: true);
                      },
                    ),
                    const SizedBox(width: 6),

                    // Settings Button
                    IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFF260A0D),
                        foregroundColor: const Color(0xFFF7F0EA),
                        side: const BorderSide(color: Color(0xFF380C10), width: 1.0),
                        minimumSize: const Size(36, 36),
                      ),
                      icon: const Icon(Icons.settings, size: 16),
                      tooltip: 'Settings',
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        SettingsModal.show(context);
                      },
                    ),
                    const SizedBox(width: 6),

                    // Sign Out Button
                    IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFF1E080A),
                        foregroundColor: const Color(0xFFFFA07A),
                        side: const BorderSide(color: Color(0xFF380C10), width: 1.0),
                        minimumSize: const Size(36, 36),
                      ),
                      icon: const Icon(Icons.logout, size: 16),
                      tooltip: 'Switch Account / Sign Out',
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.signOut();
                      },
                    ),
                  ],
                ),
              ),

              // Matchmaking Notification Banner (if any)
              if (session.matchmakingNotification != null)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xEE2A0D11),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFD4AF37), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 16, color: Color(0xFFE5C378)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          session.matchmakingNotification!,
                          style: const TextStyle(
                            color: Color(0xFFF7F0EA),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16, color: Color(0xAAF7F0EA)),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () {
                          SensoryService.instance.playButtonTap();
                          notifier.dismissMatchmakingNotification();
                        },
                      ),
                    ],
                  ),
                ),

              // 2. Main Content: 3 Minimum-Tap Hero Mode Cards
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Mode 1: DIGU (Spelling: ޑިގު)
                      Expanded(
                        child: _buildHeroModeCard(
                          context: context,
                          mode: HolhuashiGameMode.digu,
                          thaanaTitle: 'ޑިގު',
                          englishTitle: 'DIGU',
                          tagline: 'Authentic 10-Card Maldivian Rummy with Ace-restricted runs and Gin Slam.',
                          chips: const ['10 Cards', 'Runs & Sets', '1,000pt 10-Run', 'Gin Slam'],
                          elo: session.diguElo,
                          isSelected: session.selectedMode == HolhuashiGameMode.digu,
                          selectorRow: _buildVariantSelectorRow<DiguTableFormat>(
                            values: DiguTableFormat.values,
                            selected: session.diguFormat,
                            labelFor: (v) => v.shortLabel,
                            onSelected: (v) {
                              SensoryService.instance.playButtonTap();
                              notifier.selectGameMode(HolhuashiGameMode.digu);
                              notifier.setDiguFormat(v);
                            },
                          ),
                          onCardTap: () {
                            SensoryService.instance.playButtonTap();
                            notifier.selectGameMode(HolhuashiGameMode.digu);
                          },
                          onPlaySolo: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterMatchmaking(HolhuashiGameMode.digu, isPrivateRoom: false);
                          },
                          onPrivateTable: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterMatchmaking(HolhuashiGameMode.digu, isPrivateRoom: true);
                          },
                          iconBadge: '🎴',
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Mode 2: DHIHAEH (10s)
                      Expanded(
                        child: _buildHeroModeCard(
                          context: context,
                          mode: HolhuashiGameMode.dhihaeh,
                          thaanaTitle: 'ދިހައެއް',
                          englishTitle: 'DHIHAEH (10s)',
                          tagline: '4-Player 2v2 Partnership trick-taking. Dynamic trump cut & 10s capture.',
                          chips: const ['4 Players (2v2)', '5-4-4 Batch Deal', 'Trump Cut', 'Haasbagga'],
                          elo: session.dhihaehElo,
                          isSelected: session.selectedMode == HolhuashiGameMode.dhihaeh,
                          selectorRow: _buildVariantSelectorRow<DhihaehVariant>(
                            values: DhihaehVariant.values,
                            selected: session.dhihaehVariant,
                            labelFor: (v) => v == DhihaehVariant.dynamicCut
                                ? 'Dynamic Cut'
                                : 'Blind Reserve',
                            onSelected: (v) {
                              SensoryService.instance.playButtonTap();
                              notifier.selectGameMode(HolhuashiGameMode.dhihaeh);
                              notifier.setDhihaehVariant(v);
                            },
                          ),
                          onCardTap: () {
                            SensoryService.instance.playButtonTap();
                            notifier.selectGameMode(HolhuashiGameMode.dhihaeh);
                          },
                          onPlaySolo: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterMatchmaking(HolhuashiGameMode.dhihaeh, isPrivateRoom: false);
                          },
                          onPrivateTable: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterMatchmaking(HolhuashiGameMode.dhihaeh, isPrivateRoom: true);
                          },
                          iconBadge: '🔟',
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Mode 3: BONDI
                      Expanded(
                        child: _buildHeroModeCard(
                          context: context,
                          mode: HolhuashiGameMode.bondi,
                          thaanaTitle: 'ބޮނޑި',
                          englishTitle: 'BONDI',
                          tagline: 'Fast-paced 4-player trick-shedder. Mandatory ♠A lead & immediate Bondi cuts.',
                          chips: const ['Trick Shed', '♠A Mandatory Lead', 'Immediate Cut', 'Last Standing'],
                          elo: session.bondiElo,
                          isSelected: session.selectedMode == HolhuashiGameMode.bondi,
                          selectorRow: _buildVariantSelectorRow<BondiVariant>(
                            values: BondiVariant.values,
                            selected: session.bondiVariant,
                            labelFor: (v) => v == BondiVariant.standard
                                ? 'Standard'
                                : 'Suit Bondi',
                            onSelected: (v) {
                              SensoryService.instance.playButtonTap();
                              notifier.selectGameMode(HolhuashiGameMode.bondi);
                              notifier.setBondiVariant(v);
                            },
                          ),
                          onCardTap: () {
                            SensoryService.instance.playButtonTap();
                            notifier.selectGameMode(HolhuashiGameMode.bondi);
                          },
                          onPlaySolo: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterMatchmaking(HolhuashiGameMode.bondi, isPrivateRoom: false);
                          },
                          onPrivateTable: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterMatchmaking(HolhuashiGameMode.bondi, isPrivateRoom: true);
                          },
                          iconBadge: '🔥',
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 6),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVariantSelectorRow<T>({
    required List<T> values,
    required T selected,
    required String Function(T) labelFor,
    required ValueChanged<T> onSelected,
  }) {
    return Row(
      children: values.map((v) {
        final isSel = v == selected;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: v == values.last ? 0 : 4),
            child: InkWell(
              onTap: () => onSelected(v),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                height: 25,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSel
                      ? const Color(0xFFD4AF37).withValues(alpha: 0.22)
                      : const Color(0xFF0D0405),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSel ? const Color(0xFFD4AF37) : const Color(0xFF380C10),
                    width: isSel ? 1.2 : 0.8,
                  ),
                ),
                child: Text(
                  labelFor(v),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isSel ? const Color(0xFFE5C378) : const Color(0xB3F7F0EA),
                    fontSize: 9.5,
                    fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildHeroModeCard({
    required BuildContext context,
    required HolhuashiGameMode mode,
    required String thaanaTitle,
    required String englishTitle,
    required String tagline,
    required List<String> chips,
    required int elo,
    required bool isSelected,
    Widget? selectorRow,
    required VoidCallback onCardTap,
    required VoidCallback onPlaySolo,
    required VoidCallback onPrivateTable,
    required String iconBadge,
  }) {
    return GestureDetector(
      onTap: onCardTap,
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
                    blurRadius: 22,
                    spreadRadius: 2,
                  ),
                  const BoxShadow(
                    color: Colors.black87,
                    blurRadius: 14,
                    offset: Offset(0, 6),
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
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header: Emoji Badge + ELO Pill
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 34,
                  height: 34,
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
                  child: Text(iconBadge, style: const TextStyle(fontSize: 17)),
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
            const SizedBox(height: 8),

            // Titles: Thaana & English
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
            const SizedBox(height: 4),

            // Concise Tagline
            Text(
              tagline,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xB3F7F0EA),
                fontSize: 10.5,
                height: 1.25,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),

            // Compact Badge Chips Wrap
            Expanded(
              child: Wrap(
                spacing: 5,
                runSpacing: 5,
                children: chips.map((chip) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D0405),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFFD4AF37).withValues(alpha: 0.4)
                            : const Color(0xFF380C10),
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      chip,
                      style: const TextStyle(
                        color: Color(0xCCF7F0EA),
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 6),

            if (selectorRow != null) ...[
              selectorRow,
              const SizedBox(height: 6),
            ],

            // In-Card Direct Action Footer: [▶ PLAY SOLO] + [👥 Private Table]
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    key: Key('play_solo_${mode.name}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37),
                      foregroundColor: const Color(0xFF0D0605),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 4,
                    ),
                    onPressed: onPlaySolo,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.play_arrow_rounded, size: 18),
                        SizedBox(width: 4),
                        Text(
                          'PLAY SOLO',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  key: Key('private_table_${mode.name}'),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF260A0D),
                    foregroundColor: const Color(0xFFD4AF37),
                    side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                    minimumSize: const Size(40, 40),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.group_add, size: 18),
                  tooltip: 'Private Table (${mode.name.toUpperCase()})',
                  onPressed: onPrivateTable,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCloudSyncModal(
    BuildContext context,
    GameSessionState session,
    GameSessionNotifier notifier,
  ) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 480),
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: const Color(0xF9160708),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFD4AF37), width: 1.8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.9),
                  blurRadius: 32,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.cloud_sync, color: Color(0xFFD4AF37), size: 22),
                        SizedBox(width: 8),
                        Text(
                          'PROFILE & CLOUD SYNC',
                          style: TextStyle(
                            color: Color(0xFFF7F0EA),
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white70, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFF380C10), height: 20),

                // Account Provider Info Tile
                _buildSyncInfoRow(
                  'Account Provider',
                  session.authProvider.name.toUpperCase(),
                  session.isCloudSynced ? const Color(0xFF81C784) : const Color(0xFFD4AF37),
                ),
                const SizedBox(height: 6),

                // Cloud Save Tile
                _buildSyncInfoRow(
                  'Cloud Save',
                  session.isCloudSynced
                      ? 'Cloud Save Synced (${session.userEmail ?? session.displayName})'
                      : 'Device Save Only (Guest)',
                  session.isCloudSynced ? const Color(0xFF81C784) : const Color(0xFFE5C378),
                ),
                const SizedBox(height: 6),

                // Friend Code / User Identifier Tile
                _buildSyncInfoRow(
                  'Friend Code',
                  session.guestUuid.length >= 8
                      ? session.guestUuid.substring(0, 8).toUpperCase()
                      : session.guestUuid.toUpperCase(),
                  const Color(0xFFF7F0EA),
                ),
                const SizedBox(height: 6),

                // Storage Backup Tile
                _buildSyncInfoRow(
                  'Storage Status',
                  'Secure Offline Cache Active',
                  const Color(0xFF00E676),
                ),

                const SizedBox(height: 18),

                // Auth Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFFFFF),
                          foregroundColor: const Color(0xFF1F1F1F),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.g_mobiledata, size: 22, color: Color(0xFF4285F4)),
                        label: const Text(
                          'Link Google',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                        onPressed: () {
                          SensoryService.instance.playButtonTap();
                          notifier.signInWithGoogle();
                          Navigator.of(ctx).pop();
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E0B0E),
                          foregroundColor: const Color(0xFFF7F0EA),
                          side: const BorderSide(color: Color(0xFFD4AF37), width: 1.0),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.apple, size: 18, color: Color(0xFFD4AF37)),
                        label: const Text(
                          'Link Apple',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                        onPressed: () {
                          SensoryService.instance.playButtonTap();
                          notifier.signInWithApple();
                          Navigator.of(ctx).pop();
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFC84B31)),
                        foregroundColor: const Color(0xFFFFA07A),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.signOut();
                        Navigator.of(ctx).pop();
                      },
                      child: const Text(
                        'Sign Out',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget _buildSyncInfoRow(String label, String value, Color valColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0405),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0x99F7F0EA),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          Flexible(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: valColor,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
