import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// User sensory, motion, deal speed, and account link settings.
class UserSettings {
  final double sfxVolume;
  final double bgmVolume;
  final bool hapticsEnabled;
  final bool screenShakeEnabled;
  final bool fastDealSpeed;
  final bool googleLinked;
  final bool appleLinked;
  final String authProvider;
  final String? userEmail;
  final String lastPlayedMode;
  final int lastUpdateCheckMs;
  final String? ignoredUpdateTag;

  const UserSettings({
    this.sfxVolume = 0.85,
    this.bgmVolume = 0.60,
    this.hapticsEnabled = true,
    this.screenShakeEnabled = true,
    this.fastDealSpeed = false,
    this.googleLinked = false,
    this.appleLinked = false,
    this.authProvider = 'none',
    this.userEmail,
    this.lastPlayedMode = 'digu',
    this.lastUpdateCheckMs = 0,
    this.ignoredUpdateTag,
  });

  UserSettings copyWith({
    double? sfxVolume,
    double? bgmVolume,
    bool? hapticsEnabled,
    bool? screenShakeEnabled,
    bool? fastDealSpeed,
    bool? googleLinked,
    bool? appleLinked,
    String? authProvider,
    String? userEmail,
    bool clearUserEmail = false,
    String? lastPlayedMode,
    int? lastUpdateCheckMs,
    String? ignoredUpdateTag,
    bool clearIgnoredUpdateTag = false,
  }) {
    return UserSettings(
      sfxVolume: sfxVolume ?? this.sfxVolume,
      bgmVolume: bgmVolume ?? this.bgmVolume,
      hapticsEnabled: hapticsEnabled ?? this.hapticsEnabled,
      screenShakeEnabled: screenShakeEnabled ?? this.screenShakeEnabled,
      fastDealSpeed: fastDealSpeed ?? this.fastDealSpeed,
      googleLinked: googleLinked ?? this.googleLinked,
      appleLinked: appleLinked ?? this.appleLinked,
      authProvider: authProvider ?? this.authProvider,
      userEmail: clearUserEmail ? null : (userEmail ?? this.userEmail),
      lastPlayedMode: lastPlayedMode ?? this.lastPlayedMode,
      lastUpdateCheckMs: lastUpdateCheckMs ?? this.lastUpdateCheckMs,
      ignoredUpdateTag: clearIgnoredUpdateTag
          ? null
          : (ignoredUpdateTag ?? this.ignoredUpdateTag),
    );
  }

  Map<String, dynamic> toJson() => {
        'sfxVolume': sfxVolume,
        'bgmVolume': bgmVolume,
        'hapticsEnabled': hapticsEnabled,
        'screenShakeEnabled': screenShakeEnabled,
        'fastDealSpeed': fastDealSpeed,
        'googleLinked': googleLinked,
        'appleLinked': appleLinked,
        'authProvider': authProvider,
        'userEmail': userEmail,
        'lastPlayedMode': lastPlayedMode,
        'lastUpdateCheckMs': lastUpdateCheckMs,
        'ignoredUpdateTag': ignoredUpdateTag,
      };

  factory UserSettings.fromJson(Map<String, dynamic> json) {
    return UserSettings(
      sfxVolume: (json['sfxVolume'] as num?)?.toDouble() ?? 0.85,
      bgmVolume: (json['bgmVolume'] as num?)?.toDouble() ?? 0.60,
      hapticsEnabled: json['hapticsEnabled'] as bool? ?? true,
      screenShakeEnabled: json['screenShakeEnabled'] as bool? ?? true,
      fastDealSpeed: json['fastDealSpeed'] as bool? ?? false,
      googleLinked: json['googleLinked'] as bool? ?? false,
      appleLinked: json['appleLinked'] as bool? ?? false,
      authProvider: json['authProvider'] as String? ?? 'none',
      userEmail: json['userEmail'] as String?,
      lastPlayedMode: json['lastPlayedMode'] as String? ?? 'digu',
      lastUpdateCheckMs: (json['lastUpdateCheckMs'] as num?)?.toInt() ?? 0,
      ignoredUpdateTag: json['ignoredUpdateTag'] as String?,
    );
  }
}

/// Summary record of a completed match stored offline.
class OfflineMatchRecord {
  final String matchId;
  final String gameMode;
  final bool won;
  final int humanScore;
  final int opponentScore;
  final int eloDelta;
  final DateTime timestamp;

  const OfflineMatchRecord({
    required this.matchId,
    required this.gameMode,
    required this.won,
    required this.humanScore,
    required this.opponentScore,
    required this.eloDelta,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'matchId': matchId,
        'gameMode': gameMode,
        'won': won,
        'humanScore': humanScore,
        'opponentScore': opponentScore,
        'eloDelta': eloDelta,
        'timestamp': timestamp.toIso8601String(),
      };

  factory OfflineMatchRecord.fromJson(Map<String, dynamic> json) {
    return OfflineMatchRecord(
      matchId: json['matchId'] as String? ?? 'match_unknown',
      gameMode: json['gameMode'] as String? ?? 'digu',
      won: json['won'] as bool? ?? false,
      humanScore: (json['humanScore'] as num?)?.toInt() ?? 0,
      opponentScore: (json['opponentScore'] as num?)?.toInt() ?? 0,
      eloDelta: (json['eloDelta'] as num?)?.toInt() ?? 0,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// Guest/Player profile snapshot persisted locally.
class LocalPlayerProfile {
  final String uuid;
  final String displayName;
  final String avatarId;
  final int coins;
  final Map<String, int> eloByMode;
  final String? friendCode;

  const LocalPlayerProfile({
    required this.uuid,
    this.displayName = 'Raaveriyaa',
    this.avatarId = 'maldivian_captain',
    this.coins = 2450,
    this.eloByMode = LocalPersistenceRepository.defaultEloMap,
    this.friendCode,
  });

  LocalPlayerProfile copyWith({
    String? uuid,
    String? displayName,
    String? avatarId,
    int? coins,
    Map<String, int>? eloByMode,
    String? friendCode,
  }) {
    return LocalPlayerProfile(
      uuid: uuid ?? this.uuid,
      displayName: displayName ?? this.displayName,
      avatarId: avatarId ?? this.avatarId,
      coins: coins ?? this.coins,
      eloByMode: eloByMode ?? this.eloByMode,
      friendCode: friendCode ?? this.friendCode,
    );
  }
}

/// Repository backed by SharedPreferences for Guest Profile, per-mode ELO,
/// user sensory settings, offline match history, and active match recovery snapshot.
class LocalPersistenceRepository {
  static const String keyGuestUuid = 'holhuashi.guest_uuid';
  static const String keyDisplayName = 'holhuashi.display_name';
  static const String keyAvatarId = 'holhuashi.avatar_id';
  static const String keyCoins = 'holhuashi.coins';
  static const String keyEloMap = 'holhuashi.elo_map';
  static const String keyUserSettings = 'holhuashi.user_settings';
  static const String keyMatchHistory = 'holhuashi.match_history';
  static const String keyActiveMatchSnapshot = 'holhuashi.active_match_snapshot';
  static const String keyFriendCode = 'holhuashi.friend_code';
  static const String keyLastUpdateCheckMs = 'holhuashi.last_update_check_ms';
  static const String keyIgnoredUpdateTag = 'holhuashi.ignored_update_tag';

  static const Map<String, int> defaultEloMap = {
    'digu': 1284,
    'dhihaeh': 1320,
    'bondi': 1195,
  };

  SharedPreferences? _prefs;

  LocalPersistenceRepository([this._prefs]);

  /// Initializes and binds SharedPreferences instance.
  static Future<LocalPersistenceRepository> create() async {
    final prefs = await SharedPreferences.getInstance();
    final repo = LocalPersistenceRepository(prefs);
    await repo.ensureGuestProfileInitialized();
    return repo;
  }

  Future<SharedPreferences> _getPrefs() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  /// Generates a deterministic-format v4 UUID without external packages.
  static String generateUuid() {
    final rng = math.Random();
    String hex(int digits) =>
        List.generate(digits, (_) => rng.nextInt(16).toRadixString(16)).join();
    final variant = (8 + rng.nextInt(4)).toRadixString(16);
    return '${hex(8)}-${hex(4)}-4${hex(3)}-$variant${hex(3)}-${hex(12)}';
  }

  /// Ensures a Guest Profile UUID and default ELOs exist in storage.
  Future<LocalPlayerProfile> ensureGuestProfileInitialized() async {
    final prefs = await _getPrefs();
    String? uuid = prefs.getString(keyGuestUuid);
    if (uuid == null || uuid.isEmpty) {
      uuid = generateUuid();
      await prefs.setString(keyGuestUuid, uuid);
    }
    if (!prefs.containsKey(keyDisplayName)) {
      await prefs.setString(keyDisplayName, 'Raaveriyaa');
    }
    if (!prefs.containsKey(keyAvatarId)) {
      await prefs.setString(keyAvatarId, 'maldivian_captain');
    }
    if (!prefs.containsKey(keyCoins)) {
      await prefs.setInt(keyCoins, 2450);
    }
    if (!prefs.containsKey(keyEloMap)) {
      await prefs.setString(keyEloMap, jsonEncode(defaultEloMap));
    }
    return loadProfile();
  }

  /// Reads the stored Guest Profile (or defaults if not yet initialized).
  Future<LocalPlayerProfile> loadProfile() async {
    final prefs = await _getPrefs();
    var uuid = prefs.getString(keyGuestUuid);
    if (uuid == null || uuid.isEmpty) {
      uuid = generateUuid();
      await prefs.setString(keyGuestUuid, uuid);
    }
    final displayName = prefs.getString(keyDisplayName) ?? 'Raaveriyaa';
    final avatarId = prefs.getString(keyAvatarId) ?? 'maldivian_captain';
    final coins = prefs.getInt(keyCoins) ?? 2450;
    final eloMap = await loadEloMap();
    final friendCode = prefs.getString(keyFriendCode);

    return LocalPlayerProfile(
      uuid: uuid,
      displayName: displayName,
      avatarId: avatarId,
      coins: coins,
      eloByMode: eloMap,
      friendCode: friendCode,
    );
  }

  Future<String> getGuestUuid() async {
    final profile = await loadProfile();
    return profile.uuid;
  }

  Future<String> getDisplayName() async {
    final prefs = await _getPrefs();
    return prefs.getString(keyDisplayName) ?? 'Raaveriyaa';
  }

  Future<void> setDisplayName(String name) async {
    final prefs = await _getPrefs();
    await prefs.setString(keyDisplayName, name.trim().isEmpty ? 'Raaveriyaa' : name.trim());
  }

  Future<String> getAvatarId() async {
    final prefs = await _getPrefs();
    return prefs.getString(keyAvatarId) ?? 'maldivian_captain';
  }

  Future<void> setAvatarId(String avatarId) async {
    final prefs = await _getPrefs();
    await prefs.setString(keyAvatarId, avatarId);
  }

  Future<int> getCoins() async {
    final prefs = await _getPrefs();
    return prefs.getInt(keyCoins) ?? 2450;
  }

  Future<void> setCoins(int coins) async {
    final prefs = await _getPrefs();
    await prefs.setInt(keyCoins, math.max(0, coins));
  }

  /// Loads per-mode ELO map {'digu': 1284, 'dhihaeh': 1320, 'bondi': 1195}.
  Future<Map<String, int>> loadEloMap() async {
    final prefs = await _getPrefs();
    final raw = prefs.getString(keyEloMap);
    final result = Map<String, int>.from(defaultEloMap);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        for (final entry in decoded.entries) {
          if (entry.value is num) {
            result[entry.key] = (entry.value as num).toInt();
          }
        }
      } catch (_) {
        // Fallback to default ELO map on malformed JSON
      }
    }
    return result;
  }

  Future<void> saveEloMap(Map<String, int> eloMap) async {
    final prefs = await _getPrefs();
    final merged = Map<String, int>.from(defaultEloMap)..addAll(eloMap);
    await prefs.setString(keyEloMap, jsonEncode(merged));
  }

  Future<int> updateModeElo(String modeKey, int delta) async {
    final current = await loadEloMap();
    final normalized = modeKey.toLowerCase();
    final base = current[normalized] ?? defaultEloMap[normalized] ?? 1200;
    final updated = (base + delta).clamp(800, 3000);
    current[normalized] = updated;
    await saveEloMap(current);
    return updated;
  }

  /// Loads user settings (sfxVolume, bgmVolume, hapticsEnabled, screenShakeEnabled, fastDealSpeed, googleLinked).
  Future<UserSettings> loadSettings() async {
    final prefs = await _getPrefs();
    final raw = prefs.getString(keyUserSettings);
    if (raw == null || raw.isEmpty) {
      return const UserSettings();
    }
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return UserSettings.fromJson(decoded);
    } catch (_) {
      return const UserSettings();
    }
  }

  Future<void> saveSettings(UserSettings settings) async {
    final prefs = await _getPrefs();
    await prefs.setString(keyUserSettings, jsonEncode(settings.toJson()));
  }

  /// Loads offline match history records (most recent first).
  Future<List<OfflineMatchRecord>> loadMatchHistory() async {
    final prefs = await _getPrefs();
    final rawList = prefs.getStringList(keyMatchHistory);
    if (rawList == null || rawList.isEmpty) {
      return const [];
    }
    final records = <OfflineMatchRecord>[];
    for (final item in rawList) {
      try {
        final map = jsonDecode(item) as Map<String, dynamic>;
        records.add(OfflineMatchRecord.fromJson(map));
      } catch (_) {
        // Ignore corrupted entry
      }
    }
    return records;
  }

  /// Appends a completed match record to offline history (capped at 50 entries).
  Future<void> appendMatchRecord(OfflineMatchRecord record) async {
    final prefs = await _getPrefs();
    final existing = await loadMatchHistory();
    final updated = [record, ...existing].take(50).toList();
    await prefs.setStringList(
      keyMatchHistory,
      updated.map((r) => jsonEncode(r.toJson())).toList(),
    );
  }

  /// Saves active match recovery JSON snapshot for mid-game resume.
  Future<void> saveActiveMatchSnapshot(Map<String, dynamic> snapshot) async {
    final prefs = await _getPrefs();
    await prefs.setString(keyActiveMatchSnapshot, jsonEncode(snapshot));
  }

  /// Loads active match recovery JSON snapshot if available.
  Future<Map<String, dynamic>?> loadActiveMatchSnapshot() async {
    final prefs = await _getPrefs();
    final raw = prefs.getString(keyActiveMatchSnapshot);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Clears active match recovery snapshot when a match ends or is abandoned.
  Future<void> clearActiveMatchSnapshot() async {
    final prefs = await _getPrefs();
    await prefs.remove(keyActiveMatchSnapshot);
  }

  Future<String?> getFriendCode() async {
    final prefs = await _getPrefs();
    return prefs.getString(keyFriendCode);
  }

  Future<void> setFriendCode(String? friendCode) async {
    final prefs = await _getPrefs();
    if (friendCode == null || friendCode.trim().isEmpty) {
      await prefs.remove(keyFriendCode);
    } else {
      await prefs.setString(keyFriendCode, friendCode.trim());
    }
  }

  Future<int> getLastUpdateCheckMs() async {
    final prefs = await _getPrefs();
    return prefs.getInt(keyLastUpdateCheckMs) ?? 0;
  }

  Future<void> setLastUpdateCheckMs(int timestampMs) async {
    final prefs = await _getPrefs();
    await prefs.setInt(keyLastUpdateCheckMs, timestampMs);
  }

  Future<String?> getIgnoredUpdateTag() async {
    final prefs = await _getPrefs();
    return prefs.getString(keyIgnoredUpdateTag);
  }

  Future<void> setIgnoredUpdateTag(String? tag) async {
    final prefs = await _getPrefs();
    if (tag == null || tag.trim().isEmpty) {
      await prefs.remove(keyIgnoredUpdateTag);
    } else {
      await prefs.setString(keyIgnoredUpdateTag, tag.trim());
    }
  }
}

/// Global Riverpod provider for [LocalPersistenceRepository].
final localPersistenceProvider = Provider<LocalPersistenceRepository>((ref) {
  return LocalPersistenceRepository();
});
