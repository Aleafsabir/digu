import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/game_session_provider.dart';

/// Floating quick-chat button, radial/popover selector, and ephemeral speech bubbles.
class QuickChatOverlay extends ConsumerStatefulWidget {
  const QuickChatOverlay({super.key});

  @override
  ConsumerState<QuickChatOverlay> createState() => _QuickChatOverlayState();
}

class _QuickChatOverlayState extends ConsumerState<QuickChatOverlay>
    with SingleTickerProviderStateMixin {
  bool _isMenuOpen = false;
  late final AnimationController _animController;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutBack,
      reverseCurve: Curves.easeInCubic,
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _toggleMenu() {
    setState(() {
      _isMenuOpen = !_isMenuOpen;
      if (_isMenuOpen) {
        _animController.forward();
      } else {
        _animController.reverse();
      }
    });
  }

  void _selectPreset(QuickChatPreset preset) {
    ref.read(gameSessionProvider.notifier).sendQuickChat(
          preset,
          seat: CompassSeat.south,
          senderName: ref.read(gameSessionProvider).displayName,
        );
    _toggleMenu();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final activeChat = session.activeQuickChat;

    return Stack(
      children: [
        // 1. Ephemeral Speech Bubble Toast for Active Chat
        if (activeChat != null)
          _buildSeatSpeechBubble(context, activeChat),

        // 2. Backdrop Scrim when Quick-Chat Radial Menu is Open
        if (_isMenuOpen)
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _toggleMenu,
              child: Container(
                color: Colors.black.withValues(alpha: 0.45),
              ),
            ),
          ),

        // 3. Quick-Chat Preset Selection Card / Radial Popover
        Positioned(
          left: 18,
          bottom: 74,
          child: ScaleTransition(
            scale: _scaleAnimation,
            alignment: Alignment.bottomLeft,
            child: _buildPresetsMenu(context),
          ),
        ),

        // 4. Floating Circular Chat Button (Bottom Left)
        Positioned(
          left: 16,
          bottom: 16,
          child: GestureDetector(
            onTap: _toggleMenu,
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: const RadialGradient(
                  center: Alignment(-0.2, -0.3),
                  radius: 1.0,
                  colors: [Color(0xFF8B1E2B), Color(0xFF380C10), Color(0xFF160506)],
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFFD4AF37),
                  width: 1.8,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.7),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                  BoxShadow(
                    color: const Color(0xFFD4AF37).withValues(alpha: 0.35),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: AnimatedRotation(
                turns: _isMenuOpen ? 0.25 : 0.0,
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  _isMenuOpen ? Icons.close : Icons.chat_bubble_outline,
                  color: const Color(0xFFE5C378),
                  size: 22,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPresetsMenu(BuildContext context) {
    return Container(
      width: 320,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xF7150706),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFFD4AF37),
          width: 1.6,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.85),
            blurRadius: 28,
            spreadRadius: 4,
          ),
          BoxShadow(
            color: const Color(0xFFD4AF37).withValues(alpha: 0.25),
            blurRadius: 20,
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
              const Text(
                'QUICK CHAT • ބަސްތައް',
                style: TextStyle(
                  color: Color(0xFFD4AF37),
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF380C10),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'THAANA',
                  style: TextStyle(
                    color: Color(0xFFE5C378),
                    fontSize: 8.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Preset Buttons Grid / Column
          ...kHolhuashiQuickChatPresets.map((preset) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 3.0),
              child: InkWell(
                onTap: () => _selectPreset(preset),
                borderRadius: BorderRadius.circular(10),
                splashColor: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF220A0C),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF380C10)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            preset.latin,
                            style: const TextStyle(
                              color: Color(0xFFF7F0EA),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            preset.english,
                            style: const TextStyle(
                              color: Color(0x88F7F0EA),
                              fontSize: 9,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        preset.thaana,
                        textDirection: TextDirection.rtl,
                        style: const TextStyle(
                          color: Color(0xFFE5C378),
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSeatSpeechBubble(BuildContext context, QuickChatMessage chat) {
    Alignment alignment;
    EdgeInsets padding;

    switch (chat.seat) {
      case CompassSeat.south:
        alignment = Alignment.bottomCenter;
        padding = const EdgeInsets.only(bottom: 140);
        break;
      case CompassSeat.north:
        alignment = Alignment.topCenter;
        padding = const EdgeInsets.only(top: 80);
        break;
      case CompassSeat.east:
        alignment = Alignment.centerRight;
        padding = const EdgeInsets.only(right: 60);
        break;
      case CompassSeat.west:
        alignment = Alignment.centerLeft;
        padding = const EdgeInsets.only(left: 60);
        break;
    }

    return Align(
      alignment: alignment,
      child: Padding(
        padding: padding,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutBack,
          builder: (context, value, child) {
            return Transform.scale(
              scale: value,
              child: Opacity(
                opacity: value.clamp(0.0, 1.0),
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 260),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2E0C0F), Color(0xFF160506)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFD4AF37),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.8),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                      BoxShadow(
                        color: const Color(0xFFD4AF37).withValues(alpha: 0.4),
                        blurRadius: 14,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.chat_bubble,
                            color: const Color(0xFFD4AF37),
                            size: 11,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${chat.senderName} (${chat.seat.label})',
                            style: const TextStyle(
                              color: Color(0xBBF7F0EA),
                              fontSize: 9.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        chat.thaana,
                        textDirection: TextDirection.rtl,
                        style: const TextStyle(
                          color: Color(0xFFE5C378),
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        chat.latin,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
