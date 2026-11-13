import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/game_session_provider.dart';
import '../modals/settings_modal.dart';

/// 4-Seat Waiting Room & Match Lobby Screen.
///
/// Features 4-Seat Compass Table (North, South, East, West), unambiguous 6-character
/// room code (e.g., MLD842) with clipboard link sharing, target score / turn timer rule toggles,
/// spectator count, and prominent Start Match (ފަށާ) button.
class WaitingRoomScreen extends ConsumerWidget {
  const WaitingRoomScreen({super.key});

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
              // 1. Top Bar: Back, Room Code & Copy, Spectator Pill, Settings
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Back to Lobby
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                        foregroundColor: const Color(0xFFE5C378),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
                      onPressed: () => notifier.goToLobby(),
                    ),

                    // Room Code & Link Copy Group
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xF2160708),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFD4AF37), width: 1.4),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                            blurRadius: 10,
                          ),
                        ],
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
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              letterSpacing: 2.0,
                            ),
                          ),
                          const SizedBox(width: 8),

                          // Regenerate Code Button
                          IconButton(
                            icon: const Icon(Icons.refresh, size: 16, color: Color(0xFFD4AF37)),
                            tooltip: 'Generate New Room Code',
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                            onPressed: () {
                              final newCode = notifier.regenerateRoomCode();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Generated new room code: $newCode'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                          ),

                          // Copy Link Button
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF380C10),
                              foregroundColor: const Color(0xFFD4AF37),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: const Size(60, 26),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.copy, size: 12),
                            label: const Text(
                              'COPY LINK',
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800),
                            ),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: session.shareableInviteLink));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Copied invite link: ${session.shareableInviteLink}'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),

                    // Right Group: Spectator Badge & Settings
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xF2160708),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFF380C10)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.visibility, size: 14, color: Color(0xFF00E5FF)),
                              const SizedBox(width: 6),
                              Text(
                                '${session.spectatorCount} Spectators',
                                style: const TextStyle(
                                  color: Color(0xFFF7F0EA),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF260A0D),
                            foregroundColor: const Color(0xFFF7F0EA),
                            side: const BorderSide(color: Color(0xFF380C10), width: 1.2),
                            minimumSize: const Size(36, 36),
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

              // 2. Main Center: 4-Seat Compass Table & Rule Sidebar
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 6.0),
                  child: Row(
                    children: [
                      // Compass Table (Seats North, East, South, West)
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
                              // North Seat (Partner / AI)
                              _buildSeatCard(
                                occupant: session.northSeat,
                                compassTag: 'N',
                                isHumanHost: false,
                                onClaim: () => notifier.claimSeat(CompassSeat.north),
                                onToggleReady: () => notifier.toggleReady(CompassSeat.north),
                              ),

                              // Middle Row: West Seat + Center Table Felt + East Seat
                              Expanded(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    // West Seat (Opponent AI)
                                    _buildSeatCard(
                                      occupant: session.westSeat,
                                      compassTag: 'W',
                                      isHumanHost: false,
                                      onClaim: () => notifier.claimSeat(CompassSeat.west),
                                      onToggleReady: () => notifier.toggleReady(CompassSeat.west),
                                    ),

                                    // Center Table Felt Emblem
                                    Container(
                                      width: 140,
                                      height: 100,
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
                                    ),

                                    // East Seat (Opponent AI)
                                    _buildSeatCard(
                                      occupant: session.eastSeat,
                                      compassTag: 'E',
                                      isHumanHost: false,
                                      onClaim: () => notifier.claimSeat(CompassSeat.east),
                                      onToggleReady: () => notifier.toggleReady(CompassSeat.east),
                                    ),
                                  ],
                                ),
                              ),

                              // South Seat (You / Host)
                              _buildSeatCard(
                                occupant: session.southSeat,
                                compassTag: 'S',
                                isHumanHost: true,
                                onClaim: () => notifier.claimSeat(CompassSeat.south),
                                onToggleReady: () => notifier.toggleReady(CompassSeat.south),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Room Settings & Rules Panel
                      Expanded(
                        flex: 3,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xF2140506),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF380C10), width: 1.4),
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Panel Header
                              const Text(
                                'MATCH RULES',
                                style: TextStyle(
                                  color: Color(0xFFD4AF37),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'ގަވާއިދުތައް • TABLE SETTINGS',
                                style: TextStyle(
                                  color: Color(0x88F7F0EA),
                                  fontSize: 9.5,
                                ),
                              ),
                              const Divider(color: Color(0xFF380C10), height: 16),

                              // Target Score Toggle
                              const Text(
                                'TARGET SCORE',
                                style: TextStyle(
                                  color: Color(0xBBF7F0EA),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  _buildRulePill(
                                    label: '500 PTS',
                                    isSelected: session.targetScore == 500,
                                    onTap: () => notifier.setTargetScore(500),
                                  ),
                                  const SizedBox(width: 8),
                                  _buildRulePill(
                                    label: '1000 PTS',
                                    isSelected: session.targetScore == 1000,
                                    onTap: () => notifier.setTargetScore(1000),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),

                              // Turn Clock Toggle
                              const Text(
                                'TURN CLOCK',
                                style: TextStyle(
                                  color: Color(0xBBF7F0EA),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  _buildRulePill(
                                    label: '15s FAST',
                                    isSelected: session.turnTimerSeconds == 15,
                                    onTap: () => notifier.setTurnTimer(15),
                                  ),
                                  const SizedBox(width: 8),
                                  _buildRulePill(
                                    label: '30s STANDARD',
                                    isSelected: session.turnTimerSeconds == 30,
                                    onTap: () => notifier.setTurnTimer(30),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),

                              // Fill Empty Seats with Bots Switch
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: const [
                                      Text(
                                        'Fill Empty Seats',
                                        style: TextStyle(
                                          color: Color(0xFFF7F0EA),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Text(
                                        'Autofill AI bots',
                                        style: TextStyle(
                                          color: Color(0x88F7F0EA),
                                          fontSize: 9,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Switch(
                                    value: session.fillEmptySeatsWithBots,
                                    activeThumbColor: const Color(0xFFD4AF37),
                                    activeTrackColor: const Color(0xFFC84B31),
                                    inactiveTrackColor: const Color(0xFF380C10),
                                    onChanged: (v) => notifier.setFillEmptySeatsWithBots(v),
                                  ),
                                ],
                              ),

                              const Spacer(),

                              // Start Match (ފަށާ) Button
                              SizedBox(
                                width: double.infinity,
                                height: 44,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFD4AF37),
                                    foregroundColor: const Color(0xFF0D0605),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    elevation: 6,
                                    shadowColor: const Color(0xFFD4AF37).withValues(alpha: 0.5),
                                  ),
                                  onPressed: () => notifier.startMatch(),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: const [
                                      Text(
                                        'ފަށާ • START MATCH',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                      SizedBox(width: 6),
                                      Icon(Icons.play_arrow_rounded, size: 20),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
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

  Widget _buildSeatCard({
    required SeatOccupant occupant,
    required String compassTag,
    required bool isHumanHost,
    required VoidCallback onClaim,
    required VoidCallback onToggleReady,
  }) {
    return Container(
      width: 260,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isHumanHost ? const Color(0xFF260A0D) : const Color(0xFF1B0709),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isHumanHost ? const Color(0xFFD4AF37) : const Color(0xFF380C10),
          width: isHumanHost ? 1.6 : 1.0,
        ),
        boxShadow: isHumanHost
            ? [
                BoxShadow(
                  color: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                  blurRadius: 10,
                ),
              ]
            : null,
      ),
      child: Row(
        children: [
          // Compass Letter Badge
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isHumanHost ? const Color(0xFFD4AF37) : const Color(0xFF380C10),
            ),
            alignment: Alignment.center,
            child: Text(
              compassTag,
              style: TextStyle(
                color: isHumanHost ? const Color(0xFF0D0605) : const Color(0xFFE5C378),
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Player Name & Subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  occupant.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFF7F0EA),
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  '${occupant.subtitle} • ELO ${occupant.elo}',
                  style: const TextStyle(
                    color: Color(0x99F7F0EA),
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),

          // Ready / Status Pill
          GestureDetector(
            onTap: onToggleReady,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: occupant.isReady
                    ? const Color(0xFF2E7D32).withValues(alpha: 0.3)
                    : const Color(0xFFC84B31).withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: occupant.isReady ? const Color(0xFF81C784) : const Color(0xFFC84B31),
                ),
              ),
              child: Text(
                occupant.isReady ? 'READY ✓' : 'WAITING',
                style: TextStyle(
                  color: occupant.isReady ? const Color(0xFF81C784) : const Color(0xFFFFA07A),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
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
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFF1F080A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? const Color(0xFFE5C378) : const Color(0xFF380C10),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? const Color(0xFF0D0605) : const Color(0x99F7F0EA),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
            ),
          ),
        ),
      ),
    );
  }
}
