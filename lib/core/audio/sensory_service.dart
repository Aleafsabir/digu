import 'package:flame_audio/flame_audio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/local_persistence.dart';

/// Unified sensory service managing tactile haptics (`HapticFeedback`) and
/// spatial/table audio cues (`FlameAudio`) while respecting user preferences.
class SensoryService {
  static final SensoryService instance = SensoryService._internal();

  double _sfxVolume = 0.85;
  double _bgmVolume = 0.60;
  bool _hapticsEnabled = true;
  bool _bgmPlaying = false;

  SensoryService._internal();

  factory SensoryService({
    double? sfxVolume,
    double? bgmVolume,
    bool? hapticsEnabled,
  }) {
    if (sfxVolume != null) instance._sfxVolume = sfxVolume.clamp(0.0, 1.0);
    if (bgmVolume != null) instance._bgmVolume = bgmVolume.clamp(0.0, 1.0);
    if (hapticsEnabled != null) instance._hapticsEnabled = hapticsEnabled;
    return instance;
  }

  double get sfxVolume => _sfxVolume;
  double get bgmVolume => _bgmVolume;
  bool get hapticsEnabled => _hapticsEnabled;
  bool get isBgmPlaying => _bgmPlaying;

  /// Applies [UserSettings] to audio and haptic channels.
  void applySettings(UserSettings settings) {
    _sfxVolume = settings.sfxVolume.clamp(0.0, 1.0);
    _bgmVolume = settings.bgmVolume.clamp(0.0, 1.0);
    _hapticsEnabled = settings.hapticsEnabled;
  }

  /// Updates individual sensory parameters directly.
  void configure({
    double? sfxVolume,
    double? bgmVolume,
    bool? hapticsEnabled,
  }) {
    if (sfxVolume != null) _sfxVolume = sfxVolume.clamp(0.0, 1.0);
    if (bgmVolume != null) _bgmVolume = bgmVolume.clamp(0.0, 1.0);
    if (hapticsEnabled != null) _hapticsEnabled = hapticsEnabled;
  }

  // ---------------------------------------------------------------------------
  // Haptic Feedback Cues
  // ---------------------------------------------------------------------------

  Future<void> selectionClick() async {
    if (!_hapticsEnabled) return;
    try {
      await HapticFeedback.selectionClick();
    } catch (_) {}
  }

  Future<void> lightImpact() async {
    if (!_hapticsEnabled) return;
    try {
      await HapticFeedback.lightImpact();
    } catch (_) {}
  }

  Future<void> mediumImpact() async {
    if (!_hapticsEnabled) return;
    try {
      await HapticFeedback.mediumImpact();
    } catch (_) {}
  }

  Future<void> heavyImpact() async {
    if (!_hapticsEnabled) return;
    try {
      await HapticFeedback.heavyImpact();
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Flame Audio Table & Match Cues
  // ---------------------------------------------------------------------------

  Future<void> _playSfxSafe(String fileName, {double volumeScale = 1.0}) async {
    if (_sfxVolume <= 0.01) return;
    try {
      final effectiveVolume = (_sfxVolume * volumeScale).clamp(0.0, 1.0);
      await FlameAudio.play(fileName, volume: effectiveVolume);
    } catch (_) {
      // Safe fallback when audio file is absent or blocked by browser autoplay policy
    }
  }

  /// Plays riffle shuffle & cut sound + light haptic pulse.
  Future<void> playShuffle() async {
    await lightImpact();
    await _playSfxSafe('sfx_shuffle.mp3', volumeScale: 0.9);
  }

  /// Plays single card deal swoosh + subtle selection click.
  Future<void> playCardDeal() async {
    await selectionClick();
    await _playSfxSafe('sfx_card_deal.mp3', volumeScale: 0.75);
  }

  /// Plays crisp card snap on draw/discard/trick play + light impact.
  Future<void> playCardSnap() async {
    await lightImpact();
    await _playSfxSafe('sfx_card_snap.mp3', volumeScale: 0.95);
  }

  /// Plays 4-card trick sweep sound + medium haptic impact.
  Future<void> playTrickSweep() async {
    await mediumImpact();
    await _playSfxSafe('sfx_trick_sweep.mp3', volumeScale: 0.9);
  }

  /// Plays dramatic Gin Slam impact sound + heavy haptic thud.
  Future<void> playGinSlam() async {
    await heavyImpact();
    await _playSfxSafe('sfx_gin_slam.mp3', volumeScale: 1.0);
  }

  /// Plays victory / Haasbagga / Trump declaration fanfare + medium impact.
  Future<void> playFanfare() async {
    await mediumImpact();
    await _playSfxSafe('sfx_fanfare.mp3', volumeScale: 1.0);
  }

  // ---------------------------------------------------------------------------
  // Background Music (BGM) Helpers
  // ---------------------------------------------------------------------------

  Future<void> playLobbyBgm() async {
    if (_bgmVolume <= 0.01) return;
    try {
      await FlameAudio.bgm.play('bgm_lobby.mp3', volume: _bgmVolume);
      _bgmPlaying = true;
    } catch (_) {}
  }

  Future<void> playTableBgm() async {
    if (_bgmVolume <= 0.01) return;
    try {
      await FlameAudio.bgm.play('bgm_table.mp3', volume: _bgmVolume);
      _bgmPlaying = true;
    } catch (_) {}
  }

  Future<void> stopBgm() async {
    try {
      await FlameAudio.bgm.stop();
      _bgmPlaying = false;
    } catch (_) {}
  }
}

/// Global Riverpod provider for [SensoryService].
final sensoryServiceProvider = Provider<SensoryService>((ref) {
  return SensoryService.instance;
});
