import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/audio/sensory_service.dart';
import '../../core/services/update_service.dart';
import '../../state/game_session_provider.dart';
import '../modals/friends_modal.dart';
import '../modals/settings_modal.dart';
import '../modals/update_prompt_modal.dart';

/// Main Holhuashi Lobby Screen.
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
  final TextEditingController _roomCodeController = TextEditingController();

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

  @override
  void dispose() {
    _roomCodeController.dispose();
    super.dispose();
  }

  Future<void> _checkForAppUpdates() async {
    try {
      final service = widget.updateService ?? UpdateService();
      final info = await service.checkForUpdate();
      if (info != null && mounted) {
        await UpdatePromptModal.show(
          context,
          updateInfo: info,
          updateService: service,
        );
      }
    } catch (_) {
      // Non-blocking guard for test environments and offline boots
    }
  }

  String _formatStakeChip(int amount) {
    if (amount >= 1000 && amount % 1000 == 0) {
      return '${amount ~/ 1000}K';
    }
    return '$amount';
  }

  void _joinByRoomCode(GameSessionNotifier notifier) {
    final code = _roomCodeController.text.trim().toUpperCase();
    if (code.length < 4) return;
    SensoryService.instance.playButtonTap();
    SensoryService.instance.tryUnlockWebAudio();
    FocusScope.of(context).unfocus();
    notifier.joinPrivateRoomByCode(code);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);
    final handleOrStatus =
        (session.username != null && session.username!.isNotEmpty)
            ? '@${session.username}'
            : session.authStatusLabel;

    return Scaffold(
      backgroundColor: const Color(0xFF0D0605),
      resizeToAvoidBottomInset: false,
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
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Row(
                  children: [
                    // Brand Mark
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xF21C0A0D),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFFD4AF37),
                          width: 1.4,
                        ),
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

                    // Fast Queue Re-Entry Pill
                    InkWell(
                      key: const Key('btn_quick_play'),
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        SensoryService.instance.playButtonTap();
                        SensoryService.instance.tryUnlockWebAudio();
                        notifier.enterOnlineQueue(session.lastPlayedMode);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFC84B31), Color(0xFF8B1E2B)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFE5C378),
                            width: 1.2,
                          ),
                        ),
                        child: Text(
                          '⚡ ${session.lastPlayedMode.name.toUpperCase()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ),

                    const Spacer(),

                    // Interactive Profile & @handle Capsule
                    InkWell(
                      key: const Key('btn_profile_sync'),
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        SensoryService.instance.playButtonTap();
                        _showCloudSyncModal(context, notifier);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
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
                                    ? session.displayName
                                        .substring(0, 1)
                                        .toUpperCase()
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
                                  handleOrStatus,
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
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D0405),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: const Color(0xFFD4AF37)
                                      .withValues(alpha: 0.4),
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

                    // Friends Button + Badge
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        IconButton.filled(
                          key: const Key('btn_friends'),
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF260A0D),
                            foregroundColor: const Color(0xFFD4AF37),
                            side: const BorderSide(
                              color: Color(0xFFD4AF37),
                              width: 1.2,
                            ),
                            minimumSize: const Size(36, 36),
                          ),
                          icon: const Icon(Icons.people_alt_rounded, size: 17),
                          tooltip: 'Friends',
                          onPressed: () {
                            SensoryService.instance.playButtonTap();
                            FriendsModal.show(context);
                          },
                        ),
                        if (session.pendingFriendRequestCount > 0)
                          Positioned(
                            right: -2,
                            top: -2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 5,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFC84B31),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: const Color(0xFF0D0605),
                                  width: 1.2,
                                ),
                              ),
                              child: Text(
                                '${session.pendingFriendRequestCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 6),

                    // Settings Button
                    IconButton.filled(
                      key: const Key('btn_settings'),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFF260A0D),
                        foregroundColor: const Color(0xFFF7F0EA),
                        side: const BorderSide(color: Color(0xFF380C10)),
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
                      key: const Key('btn_sign_out'),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFF1E080A),
                        foregroundColor: const Color(0xFFFFA07A),
                        side: const BorderSide(color: Color(0xFF380C10)),
                        minimumSize: const Size(36, 36),
                      ),
                      icon: const Icon(Icons.logout, size: 16),
                      tooltip: 'Sign Out',
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.signOut();
                      },
                    ),
                  ],
                ),
              ),

              // Notification Banner (if active)
              if (session.matchmakingNotification != null)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xEE2A0D11),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFD4AF37)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        size: 15,
                        color: Color(0xFFE5C378),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          session.matchmakingNotification!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFFF7F0EA),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.close,
                          size: 15,
                          color: Color(0xAAF7F0EA),
                        ),
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

              // 2. Main 3 Game Mode Cards
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Mode 1: DIGU
                      Expanded(
                        child: _buildHeroModeCard(
                          mode: HolhuashiGameMode.digu,
                          thaanaTitle: 'ޑިގު',
                          englishTitle: 'DIGU',
                          iconBadge: '🎴',
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
                          onFindMatch: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterOnlineQueue(HolhuashiGameMode.digu);
                          },
                          onVsAi: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.startOfflineAiMatch(HolhuashiGameMode.digu);
                          },
                          onPrivateRoom: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.createPrivateRoom(HolhuashiGameMode.digu);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Mode 2: DHIHAEH (10s)
                      Expanded(
                        child: _buildHeroModeCard(
                          mode: HolhuashiGameMode.dhihaeh,
                          thaanaTitle: 'ދިހައެއް',
                          englishTitle: 'DHIHAEH (10s)',
                          iconBadge: '🔟',
                          elo: session.dhihaehElo,
                          isSelected:
                              session.selectedMode == HolhuashiGameMode.dhihaeh,
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
                          onFindMatch: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterOnlineQueue(HolhuashiGameMode.dhihaeh);
                          },
                          onVsAi: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.startOfflineAiMatch(HolhuashiGameMode.dhihaeh);
                          },
                          onPrivateRoom: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.createPrivateRoom(HolhuashiGameMode.dhihaeh);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Mode 3: BONDI
                      Expanded(
                        child: _buildHeroModeCard(
                          mode: HolhuashiGameMode.bondi,
                          thaanaTitle: 'ބޮނޑި',
                          englishTitle: 'BONDI',
                          iconBadge: '🔥',
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
                          onFindMatch: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.enterOnlineQueue(HolhuashiGameMode.bondi);
                          },
                          onVsAi: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.startOfflineAiMatch(HolhuashiGameMode.bondi);
                          },
                          onPrivateRoom: () {
                            SensoryService.instance.playButtonTap();
                            SensoryService.instance.tryUnlockWebAudio();
                            notifier.createPrivateRoom(HolhuashiGameMode.bondi);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Bottom Bar: Stake Selector + Room Code Join
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
                child: Row(
                  children: [
                    // Stake selector
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xF2140506),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF380C10)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'STAKE',
                            style: TextStyle(
                              color: Color(0x99F7F0EA),
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(width: 8),
                          for (final stake in const [100, 500, 1000, 5000, 10000])
                            Padding(
                              padding: const EdgeInsets.only(right: 4),
                              child: InkWell(
                                key: Key('stake_$stake'),
                                onTap: () {
                                  SensoryService.instance.playButtonTap();
                                  notifier.setStakeBuyIn(stake);
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: session.stakeBuyIn == stake
                                        ? const Color(0xFFD4AF37)
                                        : const Color(0xFF0D0405),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: session.stakeBuyIn == stake
                                          ? const Color(0xFFE5C378)
                                          : const Color(0xFF380C10),
                                    ),
                                  ),
                                  child: Text(
                                    _formatStakeChip(stake),
                                    style: TextStyle(
                                      color: session.stakeBuyIn == stake
                                          ? const Color(0xFF0D0605)
                                          : const Color(0xCCF7F0EA),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Quick Join by Room Code
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xF2140506),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF380C10)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 112,
                            height: 28,
                            child: TextField(
                              key: const Key('input_join_room_code'),
                              controller: _roomCodeController,
                              textCapitalization: TextCapitalization.characters,
                              maxLength: 8,
                              style: const TextStyle(
                                color: Color(0xFFF7F0EA),
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'monospace',
                              ),
                              decoration: const InputDecoration(
                                counterText: '',
                                isDense: true,
                                hintText: 'Room Code',
                                hintStyle: TextStyle(
                                  color: Color(0x66F7F0EA),
                                  fontSize: 10.5,
                                ),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 6,
                                ),
                                border: InputBorder.none,
                              ),
                              onSubmitted: (_) => _joinByRoomCode(notifier),
                            ),
                          ),
                          ElevatedButton(
                            key: const Key('btn_join_room_code'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF260A0D),
                              foregroundColor: const Color(0xFFE5C378),
                              side: const BorderSide(
                                color: Color(0xFFD4AF37),
                                width: 1.0,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              minimumSize: const Size(52, 28),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(9),
                              ),
                            ),
                            onPressed: () => _joinByRoomCode(notifier),
                            child: const Text(
                              'Join',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
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
                height: 26,
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
                    color: isSel
                        ? const Color(0xFFE5C378)
                        : const Color(0xB3F7F0EA),
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
    required HolhuashiGameMode mode,
    required String thaanaTitle,
    required String englishTitle,
    required String iconBadge,
    required int elo,
    required bool isSelected,
    required Widget selectorRow,
    required VoidCallback onCardTap,
    required VoidCallback onFindMatch,
    required VoidCallback onVsAi,
    required VoidCallback onPrivateRoom,
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
                ? const [
                    Color(0xFF3B1015),
                    Color(0xFF23090B),
                    Color(0xFF140506),
                  ]
                : const [
                    Color(0xFF1B0709),
                    Color(0xFF110405),
                    Color(0xFF0D0304),
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
                    color: const Color(0xFFD4AF37).withValues(alpha: 0.30),
                    blurRadius: 20,
                    spreadRadius: 1,
                  ),
                ]
              : const [
                  BoxShadow(
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
            // Header row: Badge + ELO pill
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
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
                      color: isSelected
                          ? const Color(0xFF0D0605)
                          : const Color(0xFFE5C378),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Title row
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  thaanaTitle,
                  textDirection: TextDirection.rtl,
                  style: TextStyle(
                    color: isSelected
                        ? const Color(0xFFE5C378)
                        : const Color(0xFFF7F0EA),
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    englishTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: isSelected
                          ? const Color(0xFFD4AF37)
                          : const Color(0xFFF7F0EA),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Format / Variant selector pills
            selectorRow,

            const Spacer(),

            // Action 1: Primary Online Find Match
            SizedBox(
              width: double.infinity,
              height: 36,
              child: ElevatedButton.icon(
                key: Key('find_match_${mode.name}'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD4AF37),
                  foregroundColor: const Color(0xFF0D0605),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(11),
                  ),
                  elevation: 3,
                ),
                onPressed: onFindMatch,
                icon: const Icon(Icons.public, size: 15),
                label: const Text(
                  'Find Match',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),

            // Action 2 & 3: VS AI + Private Room
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    key: Key('play_solo_${mode.name}'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF380C10)),
                      backgroundColor: const Color(0xFF140506),
                      foregroundColor: const Color(0xFFF7F0EA),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      minimumSize: const Size(0, 32),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: onVsAi,
                    child: const Text(
                      'VS AI',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: OutlinedButton(
                    key: Key('private_table_${mode.name}'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(
                        color: Color(0xFFD4AF37),
                        width: 1.0,
                      ),
                      backgroundColor: const Color(0xFF260A0D),
                      foregroundColor: const Color(0xFFE5C378),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      minimumSize: const Size(0, 32),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: onPrivateRoom,
                    child: const Text(
                      'Private Room',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
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
    GameSessionNotifier notifier,
  ) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => _ProfileIdentityDialog(notifier: notifier),
    );
  }
}

class _ProfileIdentityDialog extends ConsumerStatefulWidget {
  final GameSessionNotifier notifier;

  const _ProfileIdentityDialog({required this.notifier});

  @override
  ConsumerState<_ProfileIdentityDialog> createState() =>
      _ProfileIdentityDialogState();
}

class _ProfileIdentityDialogState
    extends ConsumerState<_ProfileIdentityDialog> {
  final TextEditingController _handleController = TextEditingController();
  bool _editingHandle = false;
  bool _savingHandle = false;
  String? _feedback;
  bool _isError = false;

  @override
  void initState() {
    super.initState();
    _handleController.text = ref.read(gameSessionProvider).username ?? '';
  }

  @override
  void dispose() {
    _handleController.dispose();
    super.dispose();
  }

  Future<void> _saveHandle() async {
    final raw = _handleController.text.trim();
    if (raw.isEmpty) return;
    setState(() {
      _savingHandle = true;
      _feedback = null;
    });
    try {
      final saved = await widget.notifier.updateHandle(raw);
      if (!mounted) return;
      setState(() {
        _savingHandle = false;
        _editingHandle = false;
        _handleController.text = saved;
        _feedback = '@$saved saved';
        _isError = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _savingHandle = false;
        _feedback = e.toString();
        _isError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final notifier = widget.notifier;
    final uidText = session.effectiveProfileId;
    final codeText = session.friendCode;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 460),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xF9160708),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD4AF37), width: 1.8),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.badge_outlined, color: Color(0xFFD4AF37), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'PROFILE',
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
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(color: Color(0xFF380C10), height: 18),

              // @handle editor row (cloud accounts)
              if (session.isCloudSynced) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D0405),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF380C10)),
                  ),
                  child: _editingHandle
                      ? Row(
                          children: [
                            const Text(
                              '@',
                              style: TextStyle(
                                color: Color(0xFFD4AF37),
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: TextField(
                                controller: _handleController,
                                autofocus: true,
                                style: const TextStyle(
                                  color: Color(0xFFF7F0EA),
                                  fontSize: 12,
                                ),
                                decoration: const InputDecoration(
                                  isDense: true,
                                  border: InputBorder.none,
                                  hintText: 'handle',
                                ),
                                onSubmitted: (_) => _saveHandle(),
                              ),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFD4AF37),
                                foregroundColor: const Color(0xFF0D0605),
                                minimumSize: Size.zero,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                              ),
                              onPressed: _savingHandle ? null : _saveHandle,
                              child: Text(
                                _savingHandle ? '...' : 'Save',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Handle',
                              style: TextStyle(
                                color: Color(0x99F7F0EA),
                                fontSize: 11,
                              ),
                            ),
                            InkWell(
                              onTap: () => setState(() => _editingHandle = true),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    (session.username != null &&
                                            session.username!.isNotEmpty)
                                        ? '@${session.username}'
                                        : 'Set @handle',
                                    style: const TextStyle(
                                      color: Color(0xFFE5C378),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Icon(
                                    Icons.edit,
                                    size: 13,
                                    color: Color(0xFFD4AF37),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 6),
              ],

              _buildInfoRow(
                'Account',
                session.isCloudSynced
                    ? (session.userEmail ?? session.authProvider.name.toUpperCase())
                    : 'Guest (Local)',
                session.isCloudSynced
                    ? const Color(0xFF81C784)
                    : const Color(0xFFD4AF37),
              ),
              const SizedBox(height: 6),

              _buildCopyableRow('UID', uidText),
              const SizedBox(height: 6),
              if (codeText != null && codeText.isNotEmpty)
                _buildCopyableRow('Code', codeText),

              if (_feedback != null) ...[
                const SizedBox(height: 8),
                Text(
                  _feedback!,
                  style: TextStyle(
                    color: _isError
                        ? const Color(0xFFFFA07A)
                        : const Color(0xFF81C784),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],

              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1F1F1F),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(
                        Icons.g_mobiledata,
                        size: 22,
                        color: Color(0xFF4285F4),
                      ),
                      label: const Text(
                        'Google',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.signInWithGoogle();
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E0B0E),
                        foregroundColor: const Color(0xFFF7F0EA),
                        side: const BorderSide(color: Color(0xFFD4AF37)),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(
                        Icons.apple,
                        size: 18,
                        color: Color(0xFFD4AF37),
                      ),
                      label: const Text(
                        'Apple',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.signInWithApple();
                        Navigator.of(context).pop();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFC84B31)),
                      foregroundColor: const Color(0xFFFFA07A),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: () {
                      SensoryService.instance.playButtonTap();
                      notifier.signOut();
                      Navigator.of(context).pop();
                    },
                    child: const Text(
                      'Sign Out',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, Color valColor) {
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
            style: const TextStyle(color: Color(0x99F7F0EA), fontSize: 11),
          ),
          const SizedBox(width: 12),
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

  Widget _buildCopyableRow(String label, String value) {
    return InkWell(
      onTap: () {
        SensoryService.instance.playButtonTap();
        Clipboard.setData(ClipboardData(text: value));
        setState(() {
          _feedback = 'Copied $label';
          _isError = false;
        });
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
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
              style: const TextStyle(color: Color(0x99F7F0EA), fontSize: 11),
            ),
            const SizedBox(width: 12),
            Flexible(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFF7F0EA),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.copy, size: 12, color: Color(0xFFD4AF37)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
