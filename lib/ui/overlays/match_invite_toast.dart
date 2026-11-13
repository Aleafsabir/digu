import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/audio/sensory_service.dart';
import '../../state/game_session_provider.dart';

/// Top-floating real-time match invitation banner (20s window).
class MatchInviteToast extends ConsumerStatefulWidget {
  const MatchInviteToast({super.key});

  @override
  ConsumerState<MatchInviteToast> createState() => _MatchInviteToastState();
}

class _MatchInviteToastState extends ConsumerState<MatchInviteToast> {
  Timer? _tickTimer;
  String? _activeInviteId;
  int _remainingSeconds = 20;

  @override
  void dispose() {
    _tickTimer?.cancel();
    super.dispose();
  }

  void _syncTimer(MatchInviteEntry? invite) {
    if (invite == null) {
      if (_tickTimer != null || _activeInviteId != null) {
        _tickTimer?.cancel();
        _tickTimer = null;
        _activeInviteId = null;
      }
      return;
    }

    if (_activeInviteId == invite.id) return;
    _activeInviteId = invite.id;
    _remainingSeconds = invite.expiresAt.difference(DateTime.now()).inSeconds.clamp(1, 25);

    _tickTimer?.cancel();
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final currentInvite = ref.read(gameSessionProvider).pendingMatchInvite;
      if (currentInvite == null || currentInvite.id != _activeInviteId) {
        timer.cancel();
        return;
      }
      final left = currentInvite.expiresAt.difference(DateTime.now()).inSeconds;
      if (left <= 0) {
        timer.cancel();
        ref.read(gameSessionProvider.notifier).dismissMatchInvite();
      } else {
        setState(() {
          _remainingSeconds = left;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final invite = ref.watch(
      gameSessionProvider.select((s) => s.pendingMatchInvite),
    );
    _syncTimer(invite);

    if (invite == null) {
      return const SizedBox.shrink();
    }

    final notifier = ref.read(gameSessionProvider.notifier);
    final senderHandle = invite.senderUsername.isNotEmpty
        ? '@${invite.senderUsername}'
        : invite.senderName;
    final modeTitle = [
      invite.mode.toUpperCase(),
      if (invite.format != null && invite.format!.isNotEmpty)
        invite.format!.toUpperCase(),
    ].join(' • ');
    final progress = (_remainingSeconds / 20.0).clamp(0.0, 1.0);

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.only(top: 10, left: 16, right: 16),
          child: Material(
            color: Colors.transparent,
            child: Container(
              key: const Key('match_invite_toast'),
              constraints: const BoxConstraints(maxWidth: 480),
              decoration: BoxDecoration(
                color: const Color(0xFA170709),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFFD4AF37),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.75),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 10, 8),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: const Color(0xFF260A0D),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFD4AF37)),
                          ),
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.sports_esports_rounded,
                            color: Color(0xFFD4AF37),
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '${invite.senderName} ($senderHandle)',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFFF7F0EA),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$modeTitle • Stake ${invite.stakeBuyIn} • ${_remainingSeconds}s',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFFE5C378),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          key: const Key('btn_decline_match_invite'),
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFFFFA07A),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            minimumSize: Size.zero,
                          ),
                          onPressed: () {
                            SensoryService.instance.playButtonTap();
                            notifier.respondToMatchInvite(false);
                          },
                          child: const Text(
                            'Decline',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        ElevatedButton(
                          key: const Key('btn_accept_match_invite'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFD4AF37),
                            foregroundColor: const Color(0xFF0D0605),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 7,
                            ),
                            minimumSize: Size.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: () {
                            SensoryService.instance.playButtonTap();
                            notifier.respondToMatchInvite(true);
                          },
                          child: const Text(
                            'Join Room',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ClipRRect(
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(14),
                      bottomRight: Radius.circular(14),
                    ),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 3,
                      backgroundColor: const Color(0xFF260A0D),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        Color(0xFFD4AF37),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
