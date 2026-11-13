import 'dart:convert';
import 'package:http/http.dart' as http;
import 'cloud_sync_service.dart';

/// Live friend record with presence and `@handle`.
class FriendEntry {
  final String friendshipId;
  final String friendId;
  final String displayName;
  final String username;
  final String avatarId;
  final int level;
  final String friendCode;
  final String presenceStatus;
  final Map<String, dynamic>? currentMatchInfo;
  final String? lastActiveAt;

  const FriendEntry({
    required this.friendshipId,
    required this.friendId,
    required this.displayName,
    this.username = '',
    this.avatarId = 'sultan',
    this.level = 1,
    this.friendCode = '',
    this.presenceStatus = 'OFFLINE',
    this.currentMatchInfo,
    this.lastActiveAt,
  });

  bool get isOnline =>
      presenceStatus == 'IN_LOBBY' ||
      presenceStatus == 'IN_QUEUE' ||
      presenceStatus == 'IN_ROOM' ||
      presenceStatus == 'IN_MATCH';

  String get handleLabel => username.isNotEmpty ? '@$username' : friendCode;

  FriendEntry copyWith({
    String? presenceStatus,
    Map<String, dynamic>? currentMatchInfo,
  }) {
    return FriendEntry(
      friendshipId: friendshipId,
      friendId: friendId,
      displayName: displayName,
      username: username,
      avatarId: avatarId,
      level: level,
      friendCode: friendCode,
      presenceStatus: presenceStatus ?? this.presenceStatus,
      currentMatchInfo: currentMatchInfo ?? this.currentMatchInfo,
      lastActiveAt: lastActiveAt,
    );
  }

  factory FriendEntry.fromJson(Map<String, dynamic> json) {
    final rawMatch = json['currentMatchInfo'] ?? json['current_match_info'];
    return FriendEntry(
      friendshipId:
          (json['friendshipId'] ?? json['friendship_id'] ?? json['friendId'] ?? '')
              .toString(),
      friendId: (json['friendId'] ?? json['friend_id'] ?? '').toString(),
      displayName:
          (json['displayName'] ?? json['display_name'] ?? 'Player').toString(),
      username: (json['username'] ?? '').toString(),
      avatarId:
          (json['avatarId'] ?? json['avatar_id'] ?? 'sultan').toString(),
      level: (json['level'] as num?)?.toInt() ?? 1,
      friendCode: (json['friendCode'] ?? json['friend_code'] ?? '').toString(),
      presenceStatus:
          (json['presenceStatus'] ?? json['presence_status'] ?? 'OFFLINE')
              .toString(),
      currentMatchInfo: rawMatch is Map<String, dynamic>
          ? rawMatch
          : rawMatch is Map
              ? Map<String, dynamic>.from(rawMatch)
              : null,
      lastActiveAt: (json['lastActiveAt'] ?? json['last_active_at'])?.toString(),
    );
  }
}

/// Pending incoming or outgoing friend request.
class FriendRequestEntry {
  final String requestId;
  final String? senderId;
  final String? receiverId;
  final String displayName;
  final String username;
  final String avatarId;
  final int level;
  final String friendCode;
  final String? createdAt;

  const FriendRequestEntry({
    required this.requestId,
    this.senderId,
    this.receiverId,
    required this.displayName,
    this.username = '',
    this.avatarId = 'sultan',
    this.level = 1,
    this.friendCode = '',
    this.createdAt,
  });

  factory FriendRequestEntry.fromJson(Map<String, dynamic> json) {
    return FriendRequestEntry(
      requestId: (json['requestId'] ?? json['request_id'] ?? '').toString(),
      senderId: (json['senderId'] ?? json['sender_id'])?.toString(),
      receiverId: (json['receiverId'] ?? json['receiver_id'])?.toString(),
      displayName:
          (json['displayName'] ?? json['display_name'] ?? 'Player').toString(),
      username: (json['username'] ?? '').toString(),
      avatarId:
          (json['avatarId'] ?? json['avatar_id'] ?? 'sultan').toString(),
      level: (json['level'] as num?)?.toInt() ?? 1,
      friendCode: (json['friendCode'] ?? json['friend_code'] ?? '').toString(),
      createdAt: (json['createdAt'] ?? json['created_at'])?.toString(),
    );
  }
}

class FriendRequestsBundle {
  final List<FriendRequestEntry> incoming;
  final List<FriendRequestEntry> outgoing;

  const FriendRequestsBundle({
    this.incoming = const [],
    this.outgoing = const [],
  });
}

/// Resolved target preview returned by `/api/friends/lookup`.
class PlayerLookupResult {
  final String id;
  final String displayName;
  final String username;
  final String avatarId;
  final int level;
  final String friendCode;
  final String presenceStatus;
  final String relationStatus;

  const PlayerLookupResult({
    required this.id,
    required this.displayName,
    this.username = '',
    this.avatarId = 'sultan',
    this.level = 1,
    this.friendCode = '',
    this.presenceStatus = 'OFFLINE',
    this.relationStatus = 'NONE',
  });

  factory PlayerLookupResult.fromJson(Map<String, dynamic> json) {
    return PlayerLookupResult(
      id: (json['id'] ?? '').toString(),
      displayName: (json['displayName'] ?? 'Player').toString(),
      username: (json['username'] ?? '').toString(),
      avatarId: (json['avatarId'] ?? 'sultan').toString(),
      level: (json['level'] as num?)?.toInt() ?? 1,
      friendCode: (json['friendCode'] ?? '').toString(),
      presenceStatus: (json['presenceStatus'] ?? 'OFFLINE').toString(),
      relationStatus: (json['relationStatus'] ?? 'NONE').toString(),
    );
  }
}

/// Real-time incoming match invite banner payload.
class MatchInviteEntry {
  final String id;
  final String roomCode;
  final String senderId;
  final String senderName;
  final String senderUsername;
  final String senderAvatarId;
  final String mode;
  final String? format;
  final int stakeBuyIn;
  final DateTime expiresAt;

  const MatchInviteEntry({
    required this.id,
    required this.roomCode,
    required this.senderId,
    required this.senderName,
    this.senderUsername = '',
    this.senderAvatarId = 'sultan',
    required this.mode,
    this.format,
    required this.stakeBuyIn,
    required this.expiresAt,
  });

  factory MatchInviteEntry.fromJson(Map<String, dynamic> json) {
    final parsedExpires = DateTime.tryParse(json['expiresAt']?.toString() ?? '');
    return MatchInviteEntry(
      id: (json['id'] ?? json['inviteId'] ?? '').toString(),
      roomCode: (json['roomCode'] ?? '').toString(),
      senderId: (json['senderId'] ?? '').toString(),
      senderName: (json['senderName'] ?? 'Player').toString(),
      senderUsername: (json['senderUsername'] ?? '').toString(),
      senderAvatarId: (json['senderAvatarId'] ?? 'sultan').toString(),
      mode: (json['mode'] ?? 'DIGU').toString(),
      format: json['format']?.toString(),
      stakeBuyIn: (json['stakeBuyIn'] as num?)?.toInt() ?? 1000,
      expiresAt: parsedExpires ?? DateTime.now().add(const Duration(seconds: 20)),
    );
  }
}

class FriendsServiceException implements Exception {
  final String message;
  const FriendsServiceException(this.message);

  @override
  String toString() => message;
}

/// HTTP client for Holhuashi friends, `@handle`/UID lookup, and request management.
class FriendsService {
  static const Duration _timeout = Duration(seconds: 10);

  final http.Client _client;
  final String _baseUrl;

  FriendsService({
    http.Client? client,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? CloudSyncService.defaultBaseUrl;

  Future<List<FriendEntry>> fetchFriends(String profileId) async {
    final uri = Uri.parse('$_baseUrl/api/friends')
        .replace(queryParameters: {'profileId': profileId});
    final res = await _client.get(uri).timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Failed to fetch friends',
      );
    }
    final rawList = body['friends'] as List<dynamic>? ?? const [];
    return rawList
        .whereType<Map<String, dynamic>>()
        .map(FriendEntry.fromJson)
        .toList();
  }

  Future<FriendRequestsBundle> fetchRequests(String profileId) async {
    final uri = Uri.parse('$_baseUrl/api/friends/requests')
        .replace(queryParameters: {'profileId': profileId});
    final res = await _client.get(uri).timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Failed to fetch requests',
      );
    }
    final incomingRaw = body['incoming'] as List<dynamic>? ?? const [];
    final outgoingRaw = body['outgoing'] as List<dynamic>? ?? const [];
    return FriendRequestsBundle(
      incoming: incomingRaw
          .whereType<Map<String, dynamic>>()
          .map(FriendRequestEntry.fromJson)
          .toList(),
      outgoing: outgoingRaw
          .whereType<Map<String, dynamic>>()
          .map(FriendRequestEntry.fromJson)
          .toList(),
    );
  }

  Future<PlayerLookupResult?> lookupPlayer({
    required String query,
    String? requesterId,
  }) async {
    final clean = query.trim();
    if (clean.isEmpty) return null;
    final uri = Uri.parse('$_baseUrl/api/friends/lookup').replace(
      queryParameters: {
        'q': clean,
        if (requesterId != null && requesterId.isNotEmpty) 'requesterId': requesterId,
      },
    );
    final res = await _client.get(uri).timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode == 404) return null;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Player search failed',
      );
    }
    final target = body['target'];
    if (target is! Map<String, dynamic>) return null;
    return PlayerLookupResult.fromJson(target);
  }

  Future<void> sendRequest({
    required String profileId,
    required String identifier,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/friends/request');
    final res = await _client
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'profileId': profileId,
            'identifier': identifier.trim(),
          }),
        )
        .timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Failed to send request',
      );
    }
  }

  Future<void> respondToRequest({
    required String requestId,
    required bool accept,
    required String profileId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/friends/respond');
    final res = await _client
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'requestId': requestId,
            'accept': accept,
            'profileId': profileId,
          }),
        )
        .timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Failed to respond to request',
      );
    }
  }

  Future<void> cancelOutgoingRequest({
    required String requestId,
    required String profileId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/friends/cancel');
    final res = await _client
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'requestId': requestId,
            'profileId': profileId,
          }),
        )
        .timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Failed to cancel request',
      );
    }
  }

  Future<void> removeFriend({
    required String profileId,
    required String friendId,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/friends/${Uri.encodeComponent(friendId)}');
    final res = await _client
        .delete(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'profileId': profileId}),
        )
        .timeout(_timeout);
    final body = _decodeMap(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw FriendsServiceException(
        body['error'] as String? ?? 'Failed to remove friend',
      );
    }
  }

  Map<String, dynamic> _decodeMap(http.Response res) {
    if (res.body.isEmpty) return <String, dynamic>{};
    try {
      final decoded = jsonDecode(res.body);
      return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }
}
