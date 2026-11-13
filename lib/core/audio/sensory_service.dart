import 'dart:async';
import 'package:flame_audio/flame_audio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/local_persistence.dart';

/// Unified sensory service managing tactile haptics (`HapticFeedback`) and
/// spatial/table audio cues (`FlameAudio`) while respecting user preferences.
///
/// Note: `FlameAudio.audioCache` already prefixes paths with `'assets/audio/'`,
/// so every track/SFX reference uses the bare filename only.
class SensoryService {
  static final SensoryService instance = SensoryService._internal();

  static const String lobbyBgmFile = 'bgm_lobby.mp3';
  static const String tableBgmFile = 'bgm_table.mp3';

  static const List<String> sfxFiles = [
    'sfx_shuffle.wav',
    'sfx_card_deal.wav',
    'sfx_card_snap.wav',
    'sfx_discard_pickup.wav',
    'sfx_card_discard.wav',
    'sfx_fan_tick.wav',
    'sfx_gin_ready.wav',
    'sfx_timer_heartbeat.wav',
    'sfx_trick_sweep.wav',
    'sfx_gin_slam.wav',
    'sfx_fanfare.wav',
  ];

  double _sfxVolume = 0.85;
  double _bgmVolume = 0.60;
  bool _hapticsEnabled = true;
  bool _bgmEnabled = true;
  bool _bgmPlaying = false;
  bool _initialized = false;
  bool _isAppBackgrounded = false;
  String? _desiredBgmTrack;
  String? _currentBgmTrack;
  int _lastFanTickMs = 0;

  SensoryService._internal();

  factory SensoryService({
    double? sfxVolume,
    double? bgmVolume,
    bool? hapticsEnabled,
    bool? bgmEnabled,
  }) {
    if (sfxVolume != null) instance._sfxVolume = sfxVolume.clamp(0.0, 1.0);
    if (bgmVolume != null) instance._bgmVolume = bgmVolume.clamp(0.0, 1.0);
    if (hapticsEnabled != null) instance._hapticsEnabled = hapticsEnabled;
    if (bgmEnabled != null) instance._bgmEnabled = bgmEnabled;
    return instance;
  }

  double get sfxVolume => _sfxVolume;
  double get bgmVolume => _bgmVolume;
  bool get hapticsEnabled => _hapticsEnabled;
  bool get bgmEnabled => _bgmEnabled;
  bool get isBgmPlaying => _bgmPlaying;
  String? get desiredBgmTrack => _desiredBgmTrack;

  /// Initializes FlameAudio BGM lifecycle observer and preloads all 11 WAV SFX.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    try {
      await FlameAudio.bgm.initialize();
    } catch (_) {}
    try {
      await FlameAudio.audioCache.loadAll(sfxFiles);
    } catch (_) {}
  }

  /// Applies [UserSettings] to audio and haptic channels and updates live BGM.
  void applySettings(UserSettings settings) {
    _sfxVolume = settings.sfxVolume.clamp(0.0, 1.0);
    _bgmVolume = settings.bgmVolume.clamp(0.0, 1.0);
    _hapticsEnabled = settings.hapticsEnabled;
    if (_initialized || _desiredBgmTrack != null) {
      unawaited(_syncBgmPlayback());
    }
  }

  /// Updates individual sensory parameters directly.
  void configure({
    double? sfxVolume,
    double? bgmVolume,
    bool? hapticsEnabled,
    bool? bgmEnabled,
  }) {
    if (sfxVolume != null) _sfxVolume = sfxVolume.clamp(0.0, 1.0);
    if (bgmVolume != null) _bgmVolume = bgmVolume.clamp(0.0, 1.0);
    if (hapticsEnabled != null) _hapticsEnabled = hapticsEnabled;
    if (bgmEnabled != null) _bgmEnabled = bgmEnabled;
    if (_initialized || _desiredBgmTrack != null) {
      unawaited(_syncBgmPlayback());
    }
  }

  Future<void> setBgmVolume(double volume) async {
    _bgmVolume = volume.clamp(0.0, 1.0);
    await _syncBgmPlayback();
  }

  Future<void> setBgmEnabled(bool enabled) async {
    _bgmEnabled = enabled;
    await _syncBgmPlayback();
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

  Future<void> vibrate() async {
    if (!_hapticsEnabled) return;
    try {
      await HapticFeedback.vibrate();
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
    if (_hapticsEnabled) await lightImpact();
    await _playSfxSafe('sfx_shuffle.wav', volumeScale: 0.90);
  }

  /// Plays single card deal swoosh + subtle selection click.
  Future<void> playCardDeal() async {
    if (_hapticsEnabled) await selectionClick();
    await _playSfxSafe('sfx_card_deal.wav', volumeScale: 0.75);
  }

  /// Plays crisp card snap on placement + light impact.
  Future<void> playCardSnap() async {
    if (_hapticsEnabled) await lightImpact();
    await _playSfxSafe('sfx_card_snap.wav', volumeScale: 0.95);
  }

  /// Plays upward pluck when drawing from the Discard pile + light impact.
  Future<void> playDiscardPickup() async {
    if (_hapticsEnabled) await lightImpact();
    await _playSfxSafe('sfx_discard_pickup.wav', volumeScale: 0.90);
  }

  /// Plays soft felt thud when discarding/playing a card + medium impact.
  Future<void> playCardDiscard() async {
    if (_hapticsEnabled) await mediumImpact();
    await _playSfxSafe('sfx_card_discard.wav', volumeScale: 0.95);
  }

  /// Plays throttled (>=35ms) wooden feather tick during hand drag-reordering.
  Future<void> playFanReorderTick() async {
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    if (nowMs - _lastFanTickMs < 35) return;
    _lastFanTickMs = nowMs;
    if (_hapticsEnabled) await selectionClick();
    await _playSfxSafe('sfx_fan_tick.wav', volumeScale: 0.65);
  }

  /// Plays hopeful C-E-G triad chime when hand becomes Gin-ready + medium impact.
  Future<void> playGinReadyChime() async {
    if (_hapticsEnabled) await mediumImpact();
    await _playSfxSafe('sfx_gin_ready.wav', volumeScale: 0.95);
  }

  /// Plays deep rhythmic pulse for critical turn timer + heavy impact.
  Future<void> playUrgentTimerHeartbeat() async {
    if (_hapticsEnabled) await heavyImpact();
    await _playSfxSafe('sfx_timer_heartbeat.wav', volumeScale: 0.95);
  }

  /// Plays 4-card trick sweep sound + medium haptic impact.
  Future<void> playTrickSweep() async {
    if (_hapticsEnabled) await mediumImpact();
    await _playSfxSafe('sfx_trick_sweep.wav', volumeScale: 0.90);
  }

  /// Plays dramatic Gin Slam impact sound + heavy haptic thud & vibration.
  Future<void> playGinSlam() async {
    if (_hapticsEnabled) {
      await heavyImpact();
      await vibrate();
    }
    await _playSfxSafe('sfx_gin_slam.wav', volumeScale: 1.0);
  }

  /// Plays victory / Haasbagga / Trump declaration fanfare + medium impact.
  Future<void> playFanfare() async {
    if (_hapticsEnabled) await mediumImpact();
    await _playSfxSafe('sfx_fanfare.wav', volumeScale: 1.0);
  }

  /// Tactile selection click for tapping a card in hand.
  Future<void> playCardSelect() async {
    await selectionClick();
  }

  /// Tactile light tap for UI buttons.
  Future<void> playButtonTap() async {
    await lightImpact();
  }

  // ---------------------------------------------------------------------------
  // Background Music (BGM) & Lifecycle Management
  // ---------------------------------------------------------------------------

  Future<void> playLobbyBgm() => _playBgmTrack(lobbyBgmFile);

  Future<void> playTableBgm() => _playBgmTrack(tableBgmFile);

  Future<void> _playBgmTrack(String fileName) async {
    _desiredBgmTrack = fileName;
    if (!_bgmEnabled || _bgmVolume <= 0.01 || _isAppBackgrounded) {
      return;
    }
    try {
      if (_bgmPlaying &&
          _currentBgmTrack == fileName &&
          FlameAudio.bgm.isPlaying) {
        await FlameAudio.bgm.audioPlayer.setVolume(_bgmVolume);
        return;
      }
      await FlameAudio.bgm.play(fileName, volume: _bgmVolume);
      _currentBgmTrack = fileName;
      _bgmPlaying = true;
    } catch (_) {}
  }

  Future<void> _syncBgmPlayback() async {
    try {
      if (!_bgmEnabled || _bgmVolume <= 0.01) {
        if (_bgmPlaying || FlameAudio.bgm.isPlaying) {
          await FlameAudio.bgm.stop();
        }
        _bgmPlaying = false;
        _currentBgmTrack = null;
        return;
      }

      if (_desiredBgmTrack != null && !_isAppBackgrounded) {
        if (_bgmPlaying && FlameAudio.bgm.isPlaying) {
          await FlameAudio.bgm.audioPlayer.setVolume(_bgmVolume);
        } else {
          await FlameAudio.bgm.play(_desiredBgmTrack!, volume: _bgmVolume);
          _currentBgmTrack = _desiredBgmTrack;
          _bgmPlaying = true;
        }
      }
    } catch (_) {}
  }

  Future<void> stopBgm() async {
    _desiredBgmTrack = null;
    _currentBgmTrack = null;
    _bgmPlaying = false;
    try {
      await FlameAudio.bgm.stop();
    } catch (_) {}
  }

  Future<void> onAppBackgrounded() async {
    _isAppBackgrounded = true;
    try {
      if (_bgmPlaying || FlameAudio.bgm.isPlaying) {
        await FlameAudio.bgm.pause();
        _bgmPlaying = false;
      }
    } catch (_) {}
  }

  Future<void> onAppForegrounded() async {
    _isAppBackgrounded = false;
    if (_desiredBgmTrack != null && _bgmEnabled && _bgmVolume > 0.01) {
      try {
        if (_currentBgmTrack == _desiredBgmTrack &&
            FlameAudio.bgm.audioPlayer.state == PlayerState.paused) {
          await FlameAudio.bgm.audioPlayer.setVolume(_bgmVolume);
          await FlameAudio.bgm.resume();
          _bgmPlaying = true;
        } else if (!FlameAudio.bgm.isPlaying) {
          await FlameAudio.bgm.play(_desiredBgmTrack!, volume: _bgmVolume);
          _currentBgmTrack = _desiredBgmTrack;
          _bgmPlaying = true;
        }
      } catch (_) {}
    }
  }

  /// Unlocks Web Audio / HTML5 BGM playback on the first user gesture if
  /// browser autoplay policy blocked initial BGM startup.
  Future<void> tryUnlockWebAudio() async {
    if (_desiredBgmTrack == null ||
        !_bgmEnabled ||
        _bgmVolume <= 0.01 ||
        _isAppBackgrounded) {
      return;
    }
    try {
      if (!FlameAudio.bgm.isPlaying) {
        await FlameAudio.bgm.play(_desiredBgmTrack!, volume: _bgmVolume);
        _currentBgmTrack = _desiredBgmTrack;
        _bgmPlaying = true;
      }
    } catch (_) {}
  }
}

/// Global Riverpod provider for [SensoryService].
final sensoryServiceProvider = Provider<SensoryService>((ref) {
  return SensoryService.instance;
});
