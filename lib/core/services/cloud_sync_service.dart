import 'dart:convert';
import 'package:http/http.dart' as http;
import 'google_auth_service.dart';

/// Remote player profile representation synchronized with the backend.
class CloudPlayerProfile {
  final String id;
  final String displayName;
  final String avatarId;
  final String loginProvider;
  final String? googleId;
  final String? email;
  final int coins;
  final int gems;
  final int level;
  final int xp;
  final int xpNextLevel;
  final String? friendCode;
  final Map<String, dynamic> stats;
  final String cloudSyncStatus;
  final String? lastSyncedAt;

  const CloudPlayerProfile({
    required this.id,
    required this.displayName,
    this.avatarId = 'maldivian_captain',
    this.loginProvider = 'GUEST',
    this.googleId,
    this.email,
    this.coins = 2450,
    this.gems = 50,
    this.level = 1,
    this.xp = 0,
    this.xpNextLevel = 500,
    this.friendCode,
    this.stats = const {},
    this.cloudSyncStatus = 'OFFLINE',
    this.lastSyncedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'displayName': displayName,
        'avatarId': avatarId,
        'loginProvider': loginProvider,
        if (googleId != null) 'googleId': googleId,
        if (email != null) 'email': email,
        'coins': coins,
        'gems': gems,
        'level': level,
        'xp': xp,
        'xpNextLevel': xpNextLevel,
        if (friendCode != null) 'friendCode': friendCode,
        'stats': stats,
        'cloudSyncStatus': cloudSyncStatus,
        if (lastSyncedAt != null) 'lastSyncedAt': lastSyncedAt,
      };

  factory CloudPlayerProfile.fromJson(Map<String, dynamic> json) {
    final rawStats = json['stats'];
    return CloudPlayerProfile(
      id: json['id']?.toString() ?? '',
      displayName: json['displayName'] as String? ?? 'Player',
      avatarId: json['avatarId'] as String? ?? 'maldivian_captain',
      loginProvider: json['loginProvider'] as String? ?? 'GOOGLE',
      googleId: json['googleId'] as String?,
      email: json['email'] as String?,
      coins: (json['coins'] as num?)?.toInt() ?? 0,
      gems: (json['gems'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
      xp: (json['xp'] as num?)?.toInt() ?? 0,
      xpNextLevel: (json['xpNextLevel'] as num?)?.toInt() ?? 500,
      friendCode: json['friendCode'] as String?,
      stats: rawStats is Map<String, dynamic>
          ? rawStats
          : rawStats is Map
              ? Map<String, dynamic>.from(rawStats)
              : const {},
      cloudSyncStatus: json['cloudSyncStatus'] as String? ?? 'SYNCED',
      lastSyncedAt: json['lastSyncedAt'] as String?,
    );
  }
}

/// Conflict payload emitted when an existing cloud profile differs from meaningful local progress.
class CloudProfileConflict {
  final CloudPlayerProfile cloudProfile;
  final CloudPlayerProfile localProfile;

  const CloudProfileConflict({
    required this.cloudProfile,
    required this.localProfile,
  });
}

/// Result of authenticating a Google account against the backend profile API.
class GoogleAuthSyncResult {
  final CloudPlayerProfile profile;
  final bool existingAccount;
  final CloudProfileConflict? conflict;

  const GoogleAuthSyncResult({
    required this.profile,
    required this.existingAccount,
    this.conflict,
  });

  bool get hasConflict => conflict != null;
}

/// Exception raised when cloud synchronization fails.
class CloudSyncException implements Exception {
  final String message;
  const CloudSyncException(this.message);

  @override
  String toString() => 'CloudSyncException: $message';
}

/// Client for synchronizing player profiles and resolving local/cloud save conflicts.
class CloudSyncService {
  static const String _baseUrl =
      'https://holhuashi-server-710897174854.us-central1.run.app';
  static const Duration _requestTimeout = Duration(seconds: 12);

  final http.Client _client;
  final String _apiBaseUrl;

  CloudSyncService({
    http.Client? client,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        _apiBaseUrl = baseUrl ?? _baseUrl;

  Future<GoogleAuthSyncResult> authenticateWithGoogle({
    required GoogleAuthUser googleUser,
    CloudPlayerProfile? localProfile,
  }) async {
    final uri = Uri.parse('$_apiBaseUrl/api/profile/google-auth');
    final payload = <String, dynamic>{
      'idToken': googleUser.idToken,
      'googleId': googleUser.id,
      'email': googleUser.email,
      'displayName': googleUser.displayName,
      'avatarUrl': googleUser.photoUrl,
      if (localProfile != null) 'localProfile': localProfile.toJson(),
    };

    final response = await _client
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        )
        .timeout(_requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw CloudSyncException(
        'Unable to verify account with server (HTTP ${response.statusCode}).',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final rawProfile = decoded['profile'];
    if (rawProfile is! Map<String, dynamic>) {
      throw const CloudSyncException('Invalid profile response from server.');
    }

    final cloudProfile = CloudPlayerProfile.fromJson(rawProfile);
    final exists = decoded['exists'] as bool? ?? false;

    CloudProfileConflict? conflict;
    if (exists &&
        localProfile != null &&
        _hasMeaningfulConflict(cloudProfile, localProfile)) {
      conflict = CloudProfileConflict(
        cloudProfile: cloudProfile,
        localProfile: localProfile,
      );
    }

    return GoogleAuthSyncResult(
      profile: cloudProfile,
      existingAccount: exists,
      conflict: conflict,
    );
  }

  Future<bool> syncProfile(CloudPlayerProfile profile) async {
    final uri = Uri.parse('$_apiBaseUrl/api/profile/sync');
    final response = await _client
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'profile': profile.toJson()}),
        )
        .timeout(_requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return false;
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['success'] as bool? ?? true;
  }

  Future<CloudPlayerProfile> resolveConflict({
    required String choice,
    required bool mergeChips,
    required CloudPlayerProfile cloudProfile,
    required CloudPlayerProfile localProfile,
  }) async {
    final uri = Uri.parse('$_apiBaseUrl/api/profile/resolve-conflict');
    final response = await _client
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'choice': choice,
            'mergeChips': mergeChips,
            'cloudProfile': cloudProfile.toJson(),
            'localProfile': localProfile.toJson(),
          }),
        )
        .timeout(_requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw CloudSyncException(
        'Failed to resolve profile conflict (HTTP ${response.statusCode}).',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final rawProfile = decoded['profile'];
    if (rawProfile is! Map<String, dynamic>) {
      throw const CloudSyncException('Invalid conflict resolution response.');
    }
    return CloudPlayerProfile.fromJson(rawProfile);
  }

  static bool _hasMeaningfulConflict(
    CloudPlayerProfile cloud,
    CloudPlayerProfile local,
  ) {
    final localGames = (local.stats['gamesPlayed'] as num?)?.toInt() ?? 0;
    final localWins = (local.stats['gamesWon'] as num?)?.toInt() ?? 0;
    final cloudGames = (cloud.stats['gamesPlayed'] as num?)?.toInt() ?? 0;
    final hasLocalProgress =
        localGames > 0 || localWins > 0 || local.coins != 2450 || local.level > 1;
    final differsFromCloud = cloud.coins != local.coins ||
        cloud.level != local.level ||
        cloudGames != localGames;
    return hasLocalProgress && differsFromCloud;
  }
}
