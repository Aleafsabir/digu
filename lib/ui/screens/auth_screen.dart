import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/audio/sensory_service.dart';
import '../../state/game_session_provider.dart';

/// Maldivian Rosewood & Gold Lacquer Auth Gateway Screen.
///
/// Welcomes users with authentic Maldivian cultural aesthetics, offering
/// Google Sign-In, Apple Sign-In, and instant Guest play backed by cloud
/// synchronization with interactive Save Conflict resolution.
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _conflictDialogShowing = false;

  void _showSaveConflictDialog(
    BuildContext context,
    CloudProfileConflict conflict,
    GameSessionNotifier notifier,
  ) {
    if (_conflictDialogShowing) return;
    _conflictDialogShowing = true;

    showDialog(
      context: context,
      barrierDismissible: false,
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
                  blurRadius: 36,
                  spreadRadius: 4,
                ),
                BoxShadow(
                  color: const Color(0xFFD4AF37).withValues(alpha: 0.25),
                  blurRadius: 24,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: const [
                    Icon(Icons.sync_problem, color: Color(0xFFD4AF37), size: 22),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'SAVE CONFLICT • ސޭވް ފުށުއެރުން',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Color(0xFFF7F0EA),
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Choose save to keep:',
                  style: TextStyle(
                    color: Color(0xBBF7F0EA),
                    fontSize: 11.5,
                  ),
                ),
                const Divider(color: Color(0xFF380C10), height: 20),

                // Comparison Table
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D0405),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF380C10)),
                  ),
                  child: Column(
                    children: [
                      // Table Header Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('DATA', style: TextStyle(color: Color(0x88F7F0EA), fontSize: 10, fontWeight: FontWeight.w800)),
                          Text('CLOUD SAVE', style: TextStyle(color: Color(0xFF81C784), fontSize: 10, fontWeight: FontWeight.w800)),
                          Text('LOCAL SAVE', style: TextStyle(color: Color(0xFFE5C378), fontSize: 10, fontWeight: FontWeight.w800)),
                        ],
                      ),
                      const Divider(color: Color(0xFF260A0D), height: 14),

                      // Player Name
                      _buildComparisonRow(
                        'Name',
                        conflict.cloudProfile.displayName,
                        conflict.localProfile.displayName,
                      ),
                      const SizedBox(height: 6),

                      // Coins
                      _buildComparisonRow(
                        'Chips',
                        '🪙 ${conflict.cloudProfile.coins}',
                        '🪙 ${conflict.localProfile.coins}',
                      ),
                      const SizedBox(height: 6),

                      // Level
                      _buildComparisonRow(
                        'Level',
                        'Lvl ${conflict.cloudProfile.level}',
                        'Lvl ${conflict.localProfile.level}',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Conflict Resolution Buttons
                Row(
                  children: [
                    // Option 1: Keep Cloud Save
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF380C10)),
                          foregroundColor: const Color(0xFF81C784),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: () {
                          SensoryService.instance.playButtonTap();
                          _conflictDialogShowing = false;
                          Navigator.of(ctx).pop();
                          notifier.resolveCloudConflict(keepCloud: true, mergeChips: false);
                        },
                        child: const Text(
                          'Keep Cloud Save',
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Option 2: Merge Chips & Sync (Primary)
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD4AF37),
                          foregroundColor: const Color(0xFF0D0605),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          elevation: 3,
                        ),
                        onPressed: () {
                          SensoryService.instance.playButtonTap();
                          _conflictDialogShowing = false;
                          Navigator.of(ctx).pop();
                          notifier.resolveCloudConflict(keepCloud: true, mergeChips: true);
                        },
                        child: const Text(
                          'Merge Chips & Sync',
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Option 3: Keep Local Save
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF380C10)),
                          foregroundColor: const Color(0xFFE5C378),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: () {
                          SensoryService.instance.playButtonTap();
                          _conflictDialogShowing = false;
                          Navigator.of(ctx).pop();
                          notifier.resolveCloudConflict(keepCloud: false, mergeChips: false);
                        },
                        child: const Text(
                          'Keep Local Save',
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800),
                        ),
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

  static Widget _buildComparisonRow(String label, String cloud, String local) {
    return Row(
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
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            cloud,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF81C784),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
            ),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            local,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFFE5C378),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);

    // Listen for Save Conflict events to open conflict dialog
    ref.listen<GameSessionState>(gameSessionProvider, (prev, next) {
      if (next.pendingCloudConflict != null &&
          prev?.pendingCloudConflict != next.pendingCloudConflict) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && next.pendingCloudConflict != null) {
            _showSaveConflictDialog(context, next.pendingCloudConflict!, notifier);
          }
        });
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF0D0605),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.3,
            colors: [
              Color(0xFF2E0C10),
              Color(0xFF180608),
              Color(0xFF0D0405),
              Color(0xFF070202),
            ],
            stops: [0.0, 0.45, 0.8, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Container(
                constraints: const BoxConstraints(minWidth: 320, maxWidth: 520),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                decoration: BoxDecoration(
                  color: const Color(0xF5160708),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: const Color(0xFFD4AF37),
                    width: 1.8,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.90),
                      blurRadius: 36,
                      spreadRadius: 4,
                    ),
                    BoxShadow(
                      color: const Color(0xFFD4AF37).withValues(alpha: 0.22),
                      blurRadius: 28,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Brand Mark: Thaana
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF260A0E),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFFD4AF37).withValues(alpha: 0.6),
                        ),
                      ),
                      child: const Text(
                        'ހޮޅުއަށި',
                        textDirection: TextDirection.rtl,
                        style: TextStyle(
                          color: Color(0xFFD4AF37),
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Header English Title
                    const Text(
                      'HOLHUASHI',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFFF7F0EA),
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Subtitle / Tagline
                    const Text(
                      'Maldivian Card Suite • ޑިގު • ދިހައެއް • ބޮނޑި',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xB3F7F0EA),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Auth Option 1: Google Sign-In
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton(
                        key: const Key('btn_sign_in_google'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFFFFF),
                          foregroundColor: const Color(0xFF1F1F1F),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 3,
                        ),
                        onPressed: session.authBusy
                            ? null
                            : () {
                                SensoryService.instance.playButtonTap();
                                notifier.signInWithGoogle();
                              },
                        child: session.authBusy
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4285F4)),
                                ),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 20,
                                    height: 20,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color(0xFF4285F4),
                                    ),
                                    alignment: Alignment.center,
                                    child: const Text(
                                      'G',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 13,
                                        fontFamily: 'sans-serif',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Flexible(
                                    child: Text(
                                      'Sign In with Google',
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Auth Option 2: Apple Sign-In
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton(
                        key: const Key('btn_sign_in_apple'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E0B0E),
                          foregroundColor: const Color(0xFFF7F0EA),
                          side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 2,
                        ),
                        onPressed: session.authBusy
                            ? null
                            : () {
                                SensoryService.instance.playButtonTap();
                                notifier.signInWithApple();
                              },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.apple, size: 20, color: Color(0xFFD4AF37)),
                            SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Sign In with Apple',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Auth Option 3: Continue as Guest
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        key: const Key('btn_sign_in_guest'),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF380C10), width: 1.4),
                          foregroundColor: const Color(0xFFE5C378),
                          backgroundColor: const Color(0xFF120506),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: session.authBusy
                            ? null
                            : () {
                                SensoryService.instance.playButtonTap();
                                notifier.signInAsGuest();
                              },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.person_outline, size: 18, color: Color(0xFFE5C378)),
                            SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Continue as Guest',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Error Message Banner (if any)
                    if (session.authErrorMessage != null) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 14),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0x33C84B31),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFC84B31)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 16, color: Color(0xFFFF8A80)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                session.authErrorMessage!,
                                style: const TextStyle(
                                  color: Color(0xFFFFA07A),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 14, color: Color(0xFFFFA07A)),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () => notifier.clearAuthError(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
