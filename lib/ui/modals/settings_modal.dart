import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/game_session_provider.dart';

class SettingsModal extends ConsumerWidget {
  const SettingsModal({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const SettingsModal(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionState = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);
    final settings = sessionState.settings;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 580, maxHeight: 420),
        decoration: BoxDecoration(
          color: const Color(0xF9120706),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: const Color(0xFFD4AF37),
            width: 1.8,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.90),
              blurRadius: 36,
              spreadRadius: 6,
            ),
            BoxShadow(
              color: const Color(0xFFD4AF37).withValues(alpha: 0.20),
              blurRadius: 24,
            ),
          ],
        ),
        child: Column(
          children: [
            // Header Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Color(0xFF380C10), width: 1.5),
                ),
                gradient: LinearGradient(
                  colors: [Color(0xFF260A0D), Color(0xFF140506)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFD4AF37).withValues(alpha: 0.15),
                          border: Border.all(
                            color: const Color(0xFFD4AF37).withValues(alpha: 0.6),
                          ),
                        ),
                        child: const Icon(
                          Icons.settings,
                          color: Color(0xFFD4AF37),
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'SETTINGS',
                            style: TextStyle(
                              color: Color(0xFFF7F0EA),
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            'ސެޓިންގްސް • AUDIO & PREFERENCES',
                            style: TextStyle(
                              color: Color(0xFFD4AF37),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFFF7F0EA), size: 20),
                    tooltip: 'Close',
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section: Audio
                    _buildSectionHeader('AUDIO CONTROLS', 'އަޑު'),
                    const SizedBox(height: 8),

                    // SFX Volume Slider
                    _buildVolumeTile(
                      icon: Icons.volume_up,
                      title: 'Sound Effects (SFX)',
                      subtitle: 'Card swooshes, table snaps, and fanfare',
                      value: settings.sfxVolume,
                      onChanged: (v) => notifier.setSfxVolume(v),
                    ),
                    const SizedBox(height: 6),

                    // BGM Volume Slider
                    _buildVolumeTile(
                      icon: Icons.music_note,
                      title: 'Background Music (BGM)',
                      subtitle: 'Island ambient melodies & Holhuashi lounge',
                      value: settings.bgmVolume,
                      onChanged: (v) => notifier.setBgmVolume(v),
                    ),

                    const Divider(color: Color(0xFF380C10), height: 22),

                    // Section: Sensory & Feel
                    _buildSectionHeader('SENSORY & FEEL', 'ތަޖުރިބާ'),
                    const SizedBox(height: 8),

                    // Haptics Toggle
                    _buildSwitchTile(
                      icon: Icons.vibration,
                      title: 'Tactile Haptics',
                      subtitle: 'Crisp phone vibration on card play & Gin slam',
                      value: settings.hapticsEnabled,
                      onChanged: (v) => notifier.toggleHaptics(),
                    ),
                    const SizedBox(height: 8),

                    // Screen Shake: NORMAL vs REDUCED MOTION
                    _buildSegmentedTile(
                      icon: Icons.screen_rotation,
                      title: 'Screen Shake',
                      subtitle: 'Impact shudder during Gin slam & trick sweeps',
                      optionLeft: 'NORMAL',
                      optionRight: 'REDUCED',
                      isLeftSelected: settings.screenShakeEnabled,
                      onSelectLeft: () => notifier.setScreenShakeEnabled(true),
                      onSelectRight: () => notifier.setScreenShakeEnabled(false),
                    ),

                    const Divider(color: Color(0xFF380C10), height: 22),

                    // Section: Gameplay
                    _buildSectionHeader('GAMEPLAY & PACE', 'ކުޅުން'),
                    const SizedBox(height: 8),

                    // Deal Speed: AUTHENTIC vs FAST
                    _buildSegmentedTile(
                      icon: Icons.speed,
                      title: 'Deal Speed',
                      subtitle: 'Traditional Maldivian pacing vs instant dealing',
                      optionLeft: 'AUTHENTIC',
                      optionRight: 'FAST',
                      isLeftSelected: !settings.fastDealSpeed,
                      onSelectLeft: () => notifier.setFastDealSpeed(false),
                      onSelectRight: () => notifier.setFastDealSpeed(true),
                    ),

                    const Divider(color: Color(0xFF380C10), height: 22),

                    // Section: Cloud & Identity
                    _buildSectionHeader('ACCOUNT & IDENTITY', 'އައިޑެންޓިޓީ'),
                    const SizedBox(height: 8),

                    // Google Play Account Link
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1B0B0C),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF380C10)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: settings.googleLinked
                                  ? const Color(0xFF2E7D32).withValues(alpha: 0.25)
                                  : const Color(0xFF380C10),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              settings.googleLinked ? Icons.verified_user : Icons.account_circle,
                              color: settings.googleLinked
                                  ? const Color(0xFF81C784)
                                  : const Color(0xFFD4AF37),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  settings.googleLinked
                                      ? 'Google Play Connected'
                                      : 'Guest Profile (${sessionState.displayName})',
                                  style: const TextStyle(
                                    color: Color(0xFFF7F0EA),
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  settings.googleLinked
                                      ? 'Cloud save active • Ratings synced'
                                      : 'ID: ${sessionState.guestUuid.substring(0, 13)}...',
                                  style: const TextStyle(
                                    color: Color(0x99F7F0EA),
                                    fontSize: 10.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: settings.googleLinked
                                  ? const Color(0xFF2E7D32)
                                  : const Color(0xFFC84B31),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              minimumSize: const Size(80, 32),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            onPressed: () => notifier.toggleGoogleLinked(),
                            child: Text(
                              settings.googleLinked ? 'LINKED ✓' : 'LINK GOOGLE',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: Color(0xFF380C10), width: 1.0),
                ),
                color: Color(0xFF140506),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Holhuashi Engine v0.1.0 • Male\', Maldives',
                    style: TextStyle(
                      color: Color(0x66F7F0EA),
                      fontSize: 10,
                      fontFamily: 'monospace',
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37),
                      foregroundColor: const Color(0xFF0D0605),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      minimumSize: const Size(90, 32),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'DONE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String english, String thaana) {
    return Row(
      children: [
        Text(
          english,
          style: const TextStyle(
            color: Color(0xFFD4AF37),
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '• $thaana',
          textDirection: TextDirection.rtl,
          style: const TextStyle(
            color: Color(0x88D4AF37),
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildVolumeTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required double value,
    required ValueChanged<double> onChanged,
  }) {
    final percent = (value * 100).round();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1A0A0B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFD4AF37), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Color(0xFFF7F0EA),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      '$percent%',
                      style: const TextStyle(
                        color: Color(0xFFD4AF37),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0x88F7F0EA),
                    fontSize: 9.5,
                  ),
                ),
                SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: const Color(0xFFD4AF37),
                    inactiveTrackColor: const Color(0xFF380C10),
                    thumbColor: const Color(0xFFD4AF37),
                    overlayColor: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                    trackHeight: 3,
                  ),
                  child: Slider(
                    value: value,
                    min: 0.0,
                    max: 1.0,
                    onChanged: onChanged,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1A0A0B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFD4AF37), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFFF7F0EA),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0x88F7F0EA),
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            activeThumbColor: const Color(0xFFD4AF37),
            activeTrackColor: const Color(0xFFC84B31),
            inactiveTrackColor: const Color(0xFF380C10),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentedTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required String optionLeft,
    required String optionRight,
    required bool isLeftSelected,
    required VoidCallback onSelectLeft,
    required VoidCallback onSelectRight,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1A0A0B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFD4AF37), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFFF7F0EA),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0x88F7F0EA),
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: const Color(0xFF0D0405),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF380C10)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: onSelectLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isLeftSelected ? const Color(0xFFD4AF37) : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      optionLeft,
                      style: TextStyle(
                        color: isLeftSelected ? const Color(0xFF0D0605) : const Color(0x99F7F0EA),
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: onSelectRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: !isLeftSelected ? const Color(0xFFC84B31) : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      optionRight,
                      style: TextStyle(
                        color: !isLeftSelected ? Colors.white : const Color(0x99F7F0EA),
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
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
