import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/game_session_provider.dart';

/// Maldivian Rosewood & Gold Lacquer Auth Gateway Screen.
///
/// Welcomes users with authentic Maldivian cultural aesthetics, offering
/// Google Sign-In, Apple Sign-In, and instant Guest play backed by Supabase
/// cloud sync and SharedPreferences local persistence.
class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(gameSessionProvider.notifier);

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
                constraints: const BoxConstraints(minWidth: 320, maxWidth: 560),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 22),
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
                      'HOLHUASHI: Maldivian Card Suite',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFFF7F0EA),
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Subtitle
                    const Text(
                      'Authentic Digu (Maldivian Rummy), Dhihaeh (10s), and Bondi in 120 FPS Flame Engine.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xB3F7F0EA),
                        fontSize: 11.5,
                        height: 1.35,
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
                        onPressed: () => notifier.signInWithGoogle(),
                        child: Row(
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
                        onPressed: () => notifier.signInWithApple(),
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
                        onPressed: () => notifier.signInAsGuest(),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.person_outline, size: 18, color: Color(0xFFE5C378)),
                            SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Continue as Guest (Local Offline)',
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
                    const SizedBox(height: 20),

                    // Footer Status Indicator: Supabase Cloud Sync & Local Persistence Ready
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFF00E676),
                            boxShadow: [
                              BoxShadow(
                                color: Color(0x8800E676),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Flexible(
                          child: Text(
                            'Supabase Cloud Sync & Local Persistence Ready',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Color(0x99F7F0EA),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                      ],
                    ),
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
