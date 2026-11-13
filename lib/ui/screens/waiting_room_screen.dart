import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/audio/sensory_service.dart';
import '../../state/game_session_provider.dart';
import '../modals/friends_modal.dart';
import '../modals/settings_modal.dart';

/// Waiting Room supporting:
/// 1) Online Public Queue (full-width seats, 0 bots, Stage-2 15s Ready Check)
/// 2) Private Rooms (open seats, host AI toggle, live friend invites)
class WaitingRoomScreen extends ConsumerStatefulWidget {
  const WaitingRoomScreen({super.key});

  @override
  ConsumerState<WaitingRoomScreen> createState() => _WaitingRoomScreenState();
}

class _WaitingRoomScreenState extends ConsumerState<WaitingRoomScreen> {
  int _lastHeartbeatSecond = -1;
  final Set<String> _invitedFriendIds = {};

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);
    final remainingSeconds = session.readyCheckSecondsRemaining;
    final isUrgent =
        session.isReadyCheckActive && remainingSeconds <= 5 && remainingSeconds > 0;

    if (isUrgent &&
        remainingSeconds != _lastHeartbeatSecond &&
        !session.southSeat.isReady) {
      _lastHeartbeatSecond = remainingSeconds;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        SensoryService.instance.playUrgentTimerHeartbeat();
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0D0605),
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.3,
            colors: [
              Color(0xFF260A0D),
              Color(0xFF140506),
              Color(0xFF0D0405),
              Color(0xFF070202),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 1. Top Header Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Row(
                  children: [
                    OutlinedButton.icon(
                      key: const Key('btn_waiting_lobby'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                        foregroundColor: const Color(0xFFE5C378),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: const Icon(Icons.arrow_back, size: 16),
                      label: const Text(
                        'LOBBY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.leaveWaitingRoom();
                      },
                    ),

                    const Spacer(),

                    if (session.isPrivateRoom)
                      _buildPrivateRoomCodePill(context, session, notifier)
                    else
                      _buildPublicQueueHeaderPill(session),

                    const Spacer(),

                    Row(
                      children: [
                        if (session.isPrivateRoom)
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: IconButton.filled(
                              key: const Key('btn_waiting_friends'),
                              style: IconButton.styleFrom(
                                backgroundColor: const Color(0xFF260A0D),
                                foregroundColor: const Color(0xFFD4AF37),
                                side: const BorderSide(
                                  color: Color(0xFFD4AF37),
                                  width: 1.1,
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
                          ),
                        IconButton.filled(
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF260A0D),
                            foregroundColor: const Color(0xFFF7F0EA),
                            side: const BorderSide(color: Color(0xFF380C10)),
                            minimumSize: const Size(36, 36),
                          ),
                          icon: const Icon(Icons.settings, size: 17),
                          tooltip: 'Settings',
                          onPressed: () {
                            SensoryService.instance.playButtonTap();
                            SettingsModal.show(context);
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              if (session.matchmakingNotification != null)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xEE2A0D11),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFD4AF37)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        size: 14,
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
                      InkWell(
                        onTap: () => notifier.dismissMatchmakingNotification(),
                        child: const Icon(
                          Icons.close,
                          size: 14,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),

              // 2. Main Area
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
                  child: session.isPrivateRoom
                      ? _buildPrivateRoomLayout(context, session, notifier)
                      : _buildOnlineQueueLayout(
                          session,
                          notifier,
                          remainingSeconds,
                          isUrgent,
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPublicQueueHeaderPill(GameSessionState session) {
    final modeTitle = session.selectedMode.name.toUpperCase();
    final fmtTitle = session.selectedMode == HolhuashiGameMode.digu
        ? ' • ${session.diguFormat.shortLabel}'
        : '';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xF2160708),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD4AF37), width: 1.3),
      ),
      child: Text(
        '$modeTitle$fmtTitle • STAKE ${session.stakeBuyIn}',
        style: const TextStyle(
          color: Color(0xFFE5C378),
          fontSize: 11.5,
          fontWeight: FontWeight.w900,
          fontFamily: 'monospace',
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildPrivateRoomCodePill(
    BuildContext context,
    GameSessionState session,
    GameSessionNotifier notifier,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xF2160708),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD4AF37), width: 1.3),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'ROOM: ',
            style: TextStyle(
              color: Color(0x99F7F0EA),
              fontSize: 10,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
            ),
          ),
          Text(
            session.roomCode,
            style: const TextStyle(
              color: Color(0xFFE5C378),
              fontSize: 15.5,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
              letterSpacing: 2.0,
            ),
          ),
          const SizedBox(width: 6),
          IconButton(
            icon: const Icon(Icons.refresh, size: 15, color: Color(0xFFD4AF37)),
            tooltip: 'New Code',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
            onPressed: () {
              SensoryService.instance.playButtonTap();
              notifier.regenerateRoomCode();
            },
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF380C10),
              foregroundColor: const Color(0xFFD4AF37),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              minimumSize: const Size(52, 26),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(9),
              ),
            ),
            icon: const Icon(Icons.copy, size: 12),
            label: const Text(
              'COPY',
              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800),
            ),
            onPressed: () {
              SensoryService.instance.playButtonTap();
              Clipboard.setData(ClipboardData(text: session.roomCode));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Copied room code ${session.roomCode}'),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  /// Online Public Queue Layout: Full-width seat slots + Stage-2 Ready Check bar.
  Widget _buildOnlineQueueLayout(
    GameSessionState session,
    GameSessionNotifier notifier,
    int remainingSeconds,
    bool isUrgent,
  ) {
    final isDuel1v1 = session.selectedMode == HolhuashiGameMode.digu &&
        session.diguFormat == DiguTableFormat.duel1v1;
    final readyHumans = session.activeCompassOrder
        .where((c) => session.seats[c]?.isHuman == true && session.seats[c]!.isReady)
        .length;

    return Column(
      children: [
        // Full-width Seat Table
        Expanded(
          child: Container(
            key: const Key('online_queue_slots_panel'),
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xF2140506),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF380C10), width: 1.4),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSeatCard(
                  occupant: session.northSeat,
                  compassTag: 'N',
                  isHumanSelf: false,
                  showReadyBadge: session.isReadyCheckActive,
                ),
                Expanded(
                  child: Row(
                    mainAxisAlignment: isDuel1v1
                        ? MainAxisAlignment.center
                        : MainAxisAlignment.spaceBetween,
                    children: [
                      if (!isDuel1v1)
                        _buildSeatCard(
                          occupant: session.westSeat,
                          compassTag: 'W',
                          isHumanSelf: false,
                          showReadyBadge: session.isReadyCheckActive,
                        ),
                      _buildCenterTableEmblem(session),
                      if (!isDuel1v1)
                        _buildSeatCard(
                          occupant: session.eastSeat,
                          compassTag: 'E',
                          isHumanSelf: false,
                          showReadyBadge: session.isReadyCheckActive,
                        ),
                    ],
                  ),
                ),
                _buildSeatCard(
                  occupant: session.southSeat,
                  compassTag: 'S',
                  isHumanSelf: true,
                  showReadyBadge: session.isReadyCheckActive,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Bottom Strip: Queue Status OR Stage-2 Ready Check
        if (!session.isReadyCheckActive)
          Container(
            key: const Key('queue_searching_bar'),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            decoration: BoxDecoration(
              color: const Color(0xF2160708),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF380C10)),
            ),
            child: Row(
              children: [
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFFD4AF37),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Searching for players... (${session.humanSeatCount}/${session.requiredSeatCount})',
                    style: const TextStyle(
                      color: Color(0xFFF7F0EA),
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                OutlinedButton(
                  key: const Key('btn_cancel_queue'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFC84B31)),
                    foregroundColor: const Color(0xFFFFA07A),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    minimumSize: Size.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: () {
                    SensoryService.instance.playButtonTap();
                    notifier.leaveWaitingRoom();
                  },
                  child: const Text(
                    'Cancel',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            key: const Key('ready_check_bar'),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isUrgent
                  ? const Color(0xEE3B1015)
                  : const Color(0xF51A080A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isUrgent
                    ? const Color(0xFFFF8A80)
                    : const Color(0xFFD4AF37),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.bolt,
                  size: 18,
                  color: isUrgent
                      ? const Color(0xFFFF8A80)
                      : const Color(0xFFD4AF37),
                ),
                const SizedBox(width: 8),
                Text(
                  'MATCH READY • ${remainingSeconds}s',
                  style: TextStyle(
                    color: isUrgent
                        ? const Color(0xFFFFA07A)
                        : const Color(0xFFE5C378),
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '$readyHumans/${session.requiredSeatCount} Ready',
                  style: const TextStyle(
                    color: Color(0xBBF7F0EA),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                OutlinedButton(
                  key: const Key('btn_decline_ready'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFC84B31)),
                    foregroundColor: const Color(0xFFFFA07A),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    minimumSize: Size.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: () {
                    SensoryService.instance.playButtonTap();
                    notifier.declineReadyCheck();
                  },
                  child: const Text(
                    'Decline',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(width: 8),
                if (!session.southSeat.isReady)
                  ElevatedButton(
                    key: const Key('btn_confirm_ready'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isUrgent
                          ? const Color(0xFFC84B31)
                          : const Color(0xFFD4AF37),
                      foregroundColor:
                          isUrgent ? Colors.white : const Color(0xFF0D0605),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 9,
                      ),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: () {
                      SensoryService.instance.playButtonTap();
                      notifier.acceptReadyCheck();
                    },
                    child: const Text(
                      'Accept Match',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0x332E7D32),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF81C784)),
                    ),
                    child: const Text(
                      'Accepted ✓',
                      style: TextStyle(
                        color: Color(0xFF81C784),
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  /// Private Room Layout: Compass Seats + Compact Controls & Invite Friends Dock.
  Widget _buildPrivateRoomLayout(
    BuildContext context,
    GameSessionState session,
    GameSessionNotifier notifier,
  ) {
    final isDuel1v1 = session.selectedMode == HolhuashiGameMode.digu &&
        session.diguFormat == DiguTableFormat.duel1v1;
    final filledSeats = session.activeCompassOrder
        .where((c) => session.seats[c]?.isOpen == false)
        .length;

    return Row(
      children: [
        // Left: Seats Table
        Expanded(
          flex: 7,
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xF2140506),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF380C10), width: 1.4),
            ),
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSeatCard(
                  occupant: session.northSeat,
                  compassTag: 'N',
                  isHumanSelf: false,
                  onClaim: () => notifier.claimSeat(CompassSeat.north),
                  onInviteTap: () => FriendsModal.show(context),
                ),
                Expanded(
                  child: Row(
                    mainAxisAlignment: isDuel1v1
                        ? MainAxisAlignment.center
                        : MainAxisAlignment.spaceBetween,
                    children: [
                      if (!isDuel1v1)
                        _buildSeatCard(
                          occupant: session.westSeat,
                          compassTag: 'W',
                          isHumanSelf: false,
                          onClaim: () => notifier.claimSeat(CompassSeat.west),
                          onInviteTap: () => FriendsModal.show(context),
                        ),
                      _buildCenterTableEmblem(session),
                      if (!isDuel1v1)
                        _buildSeatCard(
                          occupant: session.eastSeat,
                          compassTag: 'E',
                          isHumanSelf: false,
                          onClaim: () => notifier.claimSeat(CompassSeat.east),
                          onInviteTap: () => FriendsModal.show(context),
                        ),
                    ],
                  ),
                ),
                _buildSeatCard(
                  occupant: session.southSeat,
                  compassTag: 'S',
                  isHumanSelf: true,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),

        // Right: Compact Room Rules & Actions
        Expanded(
          flex: 3,
          child: Container(
            key: const Key('private_room_controls'),
            decoration: BoxDecoration(
              color: const Color(0xF2140506),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF380C10), width: 1.4),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (session.selectedMode == HolhuashiGameMode.digu)
                          Row(
                            children: [
                              for (final fmt in DiguTableFormat.values) ...[
                                _buildRulePill(
                                  label: fmt.shortLabel,
                                  isSelected: session.diguFormat == fmt,
                                  onTap: () => notifier.setDiguFormat(fmt),
                                ),
                                if (fmt != DiguTableFormat.values.last)
                                  const SizedBox(width: 4),
                              ],
                            ],
                          )
                        else if (session.selectedMode ==
                            HolhuashiGameMode.dhihaeh)
                          Row(
                            children: [
                              _buildRulePill(
                                label: 'Dynamic Cut',
                                isSelected: session.dhihaehVariant ==
                                    DhihaehVariant.dynamicCut,
                                onTap: () => notifier.setDhihaehVariant(
                                  DhihaehVariant.dynamicCut,
                                ),
                              ),
                              const SizedBox(width: 6),
                              _buildRulePill(
                                label: 'Blind Reserve',
                                isSelected: session.dhihaehVariant ==
                                    DhihaehVariant.blindReserve,
                                onTap: () => notifier.setDhihaehVariant(
                                  DhihaehVariant.blindReserve,
                                ),
                              ),
                            ],
                          )
                        else
                          Row(
                            children: [
                              _buildRulePill(
                                label: 'Standard',
                                isSelected:
                                    session.bondiVariant == BondiVariant.standard,
                                onTap: () => notifier
                                    .setBondiVariant(BondiVariant.standard),
                              ),
                              const SizedBox(width: 6),
                              _buildRulePill(
                                label: 'Suit Bondi',
                                isSelected: session.bondiVariant ==
                                    BondiVariant.suitBondi,
                                onTap: () => notifier
                                    .setBondiVariant(BondiVariant.suitBondi),
                              ),
                            ],
                          ),
                        const SizedBox(height: 8),

                        Row(
                          children: [
                            _buildRulePill(
                              label: '500 PTS',
                              isSelected: session.targetScore == 500,
                              onTap: () => notifier.setTargetScore(500),
                            ),
                            const SizedBox(width: 6),
                            _buildRulePill(
                              label: '1000 PTS',
                              isSelected: session.targetScore == 1000,
                              onTap: () => notifier.setTargetScore(1000),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),

                        Row(
                          children: [
                            _buildRulePill(
                              label: '15s',
                              isSelected: session.turnTimerSeconds == 15,
                              onTap: () => notifier.setTurnTimer(15),
                            ),
                            const SizedBox(width: 6),
                            _buildRulePill(
                              label: '30s',
                              isSelected: session.turnTimerSeconds == 30,
                              onTap: () => notifier.setTurnTimer(30),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Fill AI Bots',
                              style: TextStyle(
                                color: Color(0xFFF7F0EA),
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Switch(
                              key: const Key('switch_fill_bots'),
                              value: session.fillEmptySeatsWithBots,
                              activeThumbColor: const Color(0xFFD4AF37),
                              activeTrackColor: const Color(0xFFC84B31),
                              inactiveTrackColor: const Color(0xFF380C10),
                              onChanged: (v) =>
                                  notifier.setFillEmptySeatsWithBots(v),
                            ),
                          ],
                        ),

                        // Quick Invite Friends Bar
                        if (session.friends.isNotEmpty) ...[
                          const Divider(color: Color(0xFF380C10), height: 12),
                          for (final f in session.friends.take(3))
                            Container(
                              margin: const EdgeInsets.only(bottom: 4),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1A0709),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: const Color(0xFF380C10),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      f.displayName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Color(0xFFF7F0EA),
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  InkWell(
                                    onTap: _invitedFriendIds.contains(f.friendId)
                                        ? null
                                        : () {
                                            SensoryService.instance
                                                .playButtonTap();
                                            notifier.inviteFriendToRoom(
                                              f.friendId,
                                            );
                                            setState(
                                              () => _invitedFriendIds
                                                  .add(f.friendId),
                                            );
                                          },
                                    child: Text(
                                      _invitedFriendIds.contains(f.friendId)
                                          ? 'Sent'
                                          : 'Invite',
                                      style: TextStyle(
                                        color:
                                            _invitedFriendIds.contains(f.friendId)
                                                ? const Color(0xFF81C784)
                                                : const Color(0xFFD4AF37),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ] else ...[
                          const SizedBox(height: 4),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFF380C10)),
                                foregroundColor: const Color(0xFFE5C378),
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                minimumSize: Size.zero,
                              ),
                              icon: const Icon(Icons.person_add_alt_1, size: 14),
                              label: const Text(
                                'Invite Friends',
                                style: TextStyle(fontSize: 10.5),
                              ),
                              onPressed: () => FriendsModal.show(context),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton(
                    key: const Key('btn_start_private_match'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37),
                      disabledBackgroundColor: const Color(0xFF260A0D),
                      foregroundColor: const Color(0xFF0D0605),
                      disabledForegroundColor: const Color(0x66F7F0EA),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: session.canStartPrivateMatch
                        ? () {
                            SensoryService.instance.playButtonTap();
                            notifier.startMatch();
                          }
                        : null,
                    child: Text(
                      'Start Match ($filledSeats/${session.requiredSeatCount})',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCenterTableEmblem(GameSessionState session) {
    return Container(
      width: 148,
      height: 92,
      decoration: BoxDecoration(
        color: const Color(0xFF0D0405),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            'ހޮޅުއަށި',
            textDirection: TextDirection.rtl,
            style: TextStyle(
              color: Color(0xFFD4AF37),
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            session.selectedMode.name.toUpperCase(),
            style: const TextStyle(
              color: Color(0xFFE5C378),
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${session.targetScore} PTS • ${session.turnTimerSeconds}s',
            style: const TextStyle(
              color: Color(0x88F7F0EA),
              fontSize: 9,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeatCard({
    required SeatOccupant occupant,
    required String compassTag,
    required bool isHumanSelf,
    bool showReadyBadge = false,
    VoidCallback? onClaim,
    VoidCallback? onInviteTap,
  }) {
    final isOpen = occupant.isOpen;

    return Container(
      width: 256,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isOpen
            ? const Color(0xFF100405)
            : isHumanSelf
                ? const Color(0xFF260A0D)
                : const Color(0xFF1B0709),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isOpen
              ? const Color(0xFF380C10)
              : isHumanSelf
                  ? const Color(0xFFD4AF37)
                  : const Color(0xFF5A161E),
          width: isHumanSelf ? 1.6 : 1.0,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isHumanSelf
                  ? const Color(0xFFD4AF37)
                  : const Color(0xFF380C10),
            ),
            alignment: Alignment.center,
            child: Text(
              compassTag,
              style: TextStyle(
                color: isHumanSelf
                    ? const Color(0xFF0D0605)
                    : const Color(0xFFE5C378),
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isOpen ? 'Open Seat' : occupant.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isOpen
                        ? const Color(0x66F7F0EA)
                        : const Color(0xFFF7F0EA),
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  isOpen
                      ? 'Waiting...'
                      : occupant.username != null && occupant.username!.isNotEmpty
                          ? '@${occupant.username}'
                          : occupant.isBot
                              ? 'AI Bot'
                              : 'ELO ${occupant.elo}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0x99F7F0EA),
                    fontSize: 9.5,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
          if (isOpen && onInviteTap != null)
            IconButton(
              icon: const Icon(
                Icons.person_add_outlined,
                size: 16,
                color: Color(0xFFD4AF37),
              ),
              tooltip: 'Invite',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              onPressed: onInviteTap,
            )
          else if (!isOpen && (showReadyBadge || occupant.isBot))
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: occupant.isReady
                    ? const Color(0x332E7D32)
                    : const Color(0x33C84B31),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: occupant.isReady
                      ? const Color(0xFF81C784)
                      : const Color(0xFFC84B31),
                ),
              ),
              child: Text(
                occupant.isReady ? 'READY' : 'WAIT',
                style: TextStyle(
                  color: occupant.isReady
                      ? const Color(0xFF81C784)
                      : const Color(0xFFFFA07A),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                ),
              ),
            )
          else if (onClaim != null && isOpen)
            InkWell(
              onTap: onClaim,
              child: const Icon(
                Icons.swap_horiz,
                size: 15,
                color: Color(0x66F7F0EA),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRulePill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFF1F080A),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFFE5C378)
                  : const Color(0xFF380C10),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: isSelected
                  ? const Color(0xFF0D0605)
                  : const Color(0x99F7F0EA),
              fontSize: 9.5,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }
}
