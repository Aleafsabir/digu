import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// Connection lifecycle states for [HolhuashiWsClient].
enum WsConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

/// Authoritative WebSocket client for Holhuashi multiplayer rooms.
/// Handles auto-reconnect with exponential backoff, monotonic `seqId` tracking,
/// and typed protocol dispatchers (`ROOM_CREATE`, `ROOM_JOIN`, `READY_TOGGLE`,
/// `ACTION_SUBMIT`, `SYNC_RECONCILE`, `QUICK_CHAT_EMOTE`).
class HolhuashiWsClient {
  static const String defaultServerUrl =
      'wss://holhuashi-server-710897174854.us-central1.run.app/ws';

  final String serverUrl;
  final bool autoReconnect;
  final int maxReconnectAttempts;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;

  int _lastReceivedSeqId = 0;
  int _clientRequestCounter = 0;
  int _reconnectAttempts = 0;
  bool _manualDisconnect = false;
  String? _activeRoomCode;
  String? _activeProfileId;
  Map<String, dynamic>? _lastAuthPayload;

  final ValueNotifier<WsConnectionState> connectionStateNotifier =
      ValueNotifier<WsConnectionState>(WsConnectionState.disconnected);

  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();

  HolhuashiWsClient({
    this.serverUrl = defaultServerUrl,
    this.autoReconnect = true,
    this.maxReconnectAttempts = 8,
  });

  /// Monotonic server sequence number most recently processed by this client.
  int get seqId => _lastReceivedSeqId;
  int get lastReceivedSeqId => _lastReceivedSeqId;

  WsConnectionState get connectionState => connectionStateNotifier.value;
  bool get isConnected =>
      connectionStateNotifier.value == WsConnectionState.connected;

  /// Broadcast stream of parsed JSON messages from the authoritative server.
  Stream<Map<String, dynamic>> get messages => _messageController.stream;

  /// Connects to the WebSocket server. Safe to call in offline/test environments.
  Future<void> connect({String? roomCode, String? profileId}) async {
    _manualDisconnect = false;
    if (roomCode != null) _activeRoomCode = roomCode;
    if (profileId != null) _activeProfileId = profileId;

    if (connectionStateNotifier.value == WsConnectionState.connected ||
        connectionStateNotifier.value == WsConnectionState.connecting) {
      return;
    }

    connectionStateNotifier.value = _reconnectAttempts > 0
        ? WsConnectionState.reconnecting
        : WsConnectionState.connecting;

    try {
      final uri = Uri.parse(serverUrl);
      _channel = WebSocketChannel.connect(uri);
      connectionStateNotifier.value = WsConnectionState.connected;
      _reconnectAttempts = 0;

      _subscription?.cancel();
      _subscription = _channel!.stream.listen(
        _onRawMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
        cancelOnError: false,
      );

      _startHeartbeat();

      if (_lastAuthPayload != null) {
        sendTyped('AUTH_INIT', _lastAuthPayload!);
      }

      // Automatically reconcile state on reconnect if bound to an active room
      if (_activeRoomCode != null && _lastReceivedSeqId > 0) {
        reconcileSync(
          roomCode: _activeRoomCode!,
          lastSeqId: _lastReceivedSeqId,
        );
      }
    } catch (_) {
      connectionStateNotifier.value = WsConnectionState.disconnected;
      _scheduleReconnect();
    }
  }

  void _onRawMessage(dynamic raw) {
    if (raw is! String) return;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final incomingSeq = (decoded['seqId'] as num?)?.toInt();
      if (incomingSeq != null) {
        if (incomingSeq > _lastReceivedSeqId + 1 &&
            _lastReceivedSeqId > 0 &&
            _activeRoomCode != null) {
          // Sequence gap detected -> request authoritative reconciliation
          reconcileSync(
            roomCode: _activeRoomCode!,
            lastSeqId: _lastReceivedSeqId,
          );
        }
        if (incomingSeq > _lastReceivedSeqId) {
          _lastReceivedSeqId = incomingSeq;
        }
      }

      if (decoded['type'] == 'PING') {
        sendRaw({'type': 'PONG', 'timestamp': DateTime.now().millisecondsSinceEpoch});
        return;
      }

      if (!_messageController.isClosed) {
        _messageController.add(decoded);
      }
    } catch (_) {
      // Ignore malformed payload
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (isConnected) {
        sendRaw({
          'type': 'PING',
          'seqId': _lastReceivedSeqId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        });
      }
    });
  }

  void _scheduleReconnect() {
    _heartbeatTimer?.cancel();
    if (_manualDisconnect || !autoReconnect) {
      connectionStateNotifier.value = WsConnectionState.disconnected;
      return;
    }
    if (_reconnectAttempts >= maxReconnectAttempts) {
      connectionStateNotifier.value = WsConnectionState.disconnected;
      return;
    }

    _reconnectAttempts++;
    connectionStateNotifier.value = WsConnectionState.reconnecting;
    final delayMs = (500 * (1 << (_reconnectAttempts - 1))).clamp(500, 10000);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delayMs), () {
      connect();
    });
  }

  /// Sends a raw JSON payload over the active WebSocket channel.
  void sendRaw(Map<String, dynamic> payload) {
    final enriched = <String, dynamic>{
      'clientReqId': ++_clientRequestCounter,
      'seqId': _lastReceivedSeqId,
      ...payload,
    };
    try {
      _channel?.sink.add(jsonEncode(enriched));
    } catch (_) {}
  }

  /// Sends a canonical `{type, clientReqId, seqId, payload}` envelope matching the backend server.
  void sendTyped(String type, Map<String, dynamic> payload) {
    sendRaw({
      'type': type,
      'payload': payload,
    });
  }

  // ---------------------------------------------------------------------------
  // Holhuashi Protocol Actions
  // ---------------------------------------------------------------------------

  /// Registers the player identity on the active WebSocket and broadcasts online presence.
  void authenticate({
    required String profileId,
    required String displayName,
    String? username,
    String? loginProvider,
    String avatarId = 'sultan',
    String? friendCode,
    int level = 1,
    String? sessionToken,
  }) {
    _activeProfileId = profileId;
    final authPayload = <String, dynamic>{
      'profileId': profileId,
      'displayName': displayName,
      if (username != null && username.isNotEmpty) 'username': username,
      if (loginProvider != null) 'loginProvider': loginProvider,
      'avatarId': avatarId,
      if (friendCode != null && friendCode.isNotEmpty) 'friendCode': friendCode,
      'level': level,
      if (sessionToken != null) 'sessionToken': sessionToken,
    };
    _lastAuthPayload = authPayload;
    if (isConnected) {
      sendTyped('AUTH_INIT', authPayload);
    }
  }

  /// Joins the public matchmaking queue for [mode] + [variant] + [stakeBuyIn] (zero bots).
  void matchmakeJoin({
    required Map<String, dynamic> profile,
    required String mode,
    String? variant,
    int stakeBuyIn = 1000,
    int targetScore = 1000,
    int turnTimerSeconds = 15,
    String? sessionToken,
  }) {
    _activeProfileId = profile['id']?.toString() ?? _activeProfileId;
    sendTyped('MATCHMAKE_JOIN', {
      'profile': profile,
      'mode': mode,
      if (variant != null) 'variant': variant,
      'stakeBuyIn': stakeBuyIn,
      'targetScore': targetScore,
      'turnTimerSeconds': turnTimerSeconds,
      if (sessionToken != null) 'sessionToken': sessionToken,
    });
  }

  /// Cancels active public matchmaking or leaves a pre-game queue room cleanly.
  void matchmakeCancel({String? roomCode, String? profileId}) {
    final code = roomCode ?? _activeRoomCode;
    sendTyped('MATCHMAKE_CANCEL', {
      if (code != null) 'roomCode': code,
      'profileId': profileId ?? _activeProfileId,
    });
    _activeRoomCode = null;
  }

  /// Broadcasts player presence (`IN_LOBBY`, `IN_QUEUE`, `IN_ROOM`, `IN_MATCH`).
  void updatePresence({
    required String status,
    Map<String, dynamic>? matchInfo,
  }) {
    if (!isConnected) return;
    sendTyped('UPDATE_PRESENCE', {
      'status': status,
      if (matchInfo != null) 'matchInfo': matchInfo,
    });
  }

  /// Sends a live match invitation to an online friend.
  void sendMatchInvite({
    required String friendId,
    required String roomCode,
    String? roomId,
    required String mode,
    String? format,
    int stakeBuyIn = 1000,
    int targetScore = 1000,
  }) {
    sendTyped('SEND_MATCH_INVITE', {
      'friendId': friendId,
      if (roomId != null) 'roomId': roomId,
      'roomCode': roomCode,
      'mode': mode,
      if (format != null) 'format': format,
      'stakeBuyIn': stakeBuyIn,
      'targetScore': targetScore,
    });
  }

  /// Accepts or declines an incoming match invitation.
  void respondMatchInvite({
    required String inviteId,
    required bool accept,
  }) {
    sendTyped('RESPOND_MATCH_INVITE', {
      'inviteId': inviteId,
      'accept': accept,
    });
  }

  /// Sends `ROOM_CREATE` to initialize a private or matchmaking table.
  void createRoom({
    required String profileId,
    required String displayName,
    String? username,
    String avatarId = 'sultan',
    String mode = 'DIGU',
    String? variant,
    int stakeBuyIn = 1000,
    int targetScore = 1000,
    int turnTimerSeconds = 15,
    bool fillEmptySeatsWithBots = false,
    bool isPrivate = true,
    String? preferredRoomCode,
  }) {
    _activeProfileId = profileId;
    if (preferredRoomCode != null) _activeRoomCode = preferredRoomCode;
    sendTyped('ROOM_CREATE', {
      'hostProfile': {
        'id': profileId,
        'displayName': displayName,
        if (username != null) 'username': username,
        'avatarId': avatarId,
      },
      'profileId': profileId,
      'displayName': displayName,
      'mode': mode,
      'gameMode': mode.toLowerCase(),
      if (variant != null) 'variant': variant,
      'stakeBuyIn': stakeBuyIn,
      'targetScore': targetScore,
      'turnTimerSeconds': turnTimerSeconds,
      'fillEmptySeatsWithBots': fillEmptySeatsWithBots,
      'isPrivate': isPrivate,
      if (preferredRoomCode != null) 'roomCode': preferredRoomCode,
    });
  }

  /// Sends `ROOM_JOIN` to join a 6-character (e.g., `MLD842`) or 4-digit room code.
  void joinRoom({
    required String roomCode,
    required String profileId,
    required String displayName,
    String? username,
    String avatarId = 'sultan',
    bool asSpectator = false,
  }) {
    _activeRoomCode = roomCode.toUpperCase();
    _activeProfileId = profileId;
    sendTyped('ROOM_JOIN', {
      'roomCode': _activeRoomCode,
      'profile': {
        'id': profileId,
        'displayName': displayName,
        if (username != null) 'username': username,
        'avatarId': avatarId,
      },
      'profileId': profileId,
      'displayName': displayName,
      'asSpectator': asSpectator,
    });
  }

  /// Sends `ROOM_LEAVE` to exit the current room.
  void leaveRoom({String? roomCode}) {
    final code = roomCode ?? _activeRoomCode;
    if (code != null) {
      sendTyped('ROOM_LEAVE', {
        'roomCode': code,
        if (_activeProfileId != null) 'profileId': _activeProfileId,
      });
    }
    _activeRoomCode = null;
  }

  /// Sends `SEAT_ASSIGN` to claim a compass seat (0=South, 1=East, 2=North, 3=West).
  void assignSeat({
    required String roomCode,
    required int seatIndex,
    String? profileId,
  }) {
    sendTyped('SEAT_ASSIGN', {
      'roomCode': roomCode,
      'seatIndex': seatIndex,
      'profileId': profileId ?? _activeProfileId,
    });
  }

  /// Sends `READY_TOGGLE` to accept/decline Ready Check or update private room toggles.
  void toggleReady({
    required String roomCode,
    required bool isReady,
    bool? accept,
    bool? fillEmptySeatsWithBots,
    int? targetScore,
    int? turnTimerSeconds,
    String? profileId,
  }) {
    sendTyped('READY_TOGGLE', {
      'roomCode': roomCode,
      'isReady': isReady,
      if (accept != null) 'accept': accept,
      if (fillEmptySeatsWithBots != null)
        'fillEmptySeatsWithBots': fillEmptySeatsWithBots,
      if (targetScore != null) 'targetScore': targetScore,
      if (turnTimerSeconds != null) 'turnTimerSeconds': turnTimerSeconds,
      'profileId': profileId ?? _activeProfileId,
    });
  }

  /// Sends `MATCH_START` from the room host.
  void startMatch({
    required String roomCode,
    bool? fillEmptySeatsWithBots,
  }) {
    sendTyped('MATCH_START', {
      'roomCode': roomCode,
      if (fillEmptySeatsWithBots != null)
        'fillEmptySeatsWithBots': fillEmptySeatsWithBots,
    });
  }

  /// Sends `ACTION_SUBMIT` for card draw, discard, trick play, trump declaration, or Gin slam.
  void submitAction({
    required String roomCode,
    required String actionType,
    Map<String, dynamic> actionData = const {},
  }) {
    sendTyped('ACTION_SUBMIT', {
      'roomCode': roomCode,
      'actionType': actionType,
      'payload': actionData,
      'clientSeqId': _lastReceivedSeqId,
    });
  }

  /// Sends `SYNC_RECONCILE` to fetch authoritative state snapshot on sequence gap or resume.
  void reconcileSync({
    required String roomCode,
    int? lastSeqId,
  }) {
    sendTyped('SYNC_RECONCILE', {
      'roomCode': roomCode,
      'lastSeqId': lastSeqId ?? _lastReceivedSeqId,
    });
  }

  /// Sends `QUICK_CHAT_EMOTE` to broadcast a Maldivian Thaana/Latin quick-chat phrase.
  void sendQuickChatEmote({
    required String roomCode,
    required String emoteId,
    required String text,
    String? thaanaText,
    String? senderName,
  }) {
    sendTyped('QUICK_CHAT_EMOTE', {
      'roomCode': roomCode,
      'emoteId': emoteId,
      'text': text,
      if (thaanaText != null) 'thaanaText': thaanaText,
      if (senderName != null) 'senderName': senderName,
    });
  }

  /// Cleanly closes the WebSocket connection and cancels timers.
  Future<void> disconnect() async {
    _manualDisconnect = true;
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    await _subscription?.cancel();
    try {
      await _channel?.sink.close();
    } catch (_) {}
    connectionStateNotifier.value = WsConnectionState.disconnected;
  }

  Future<void> dispose() async {
    await disconnect();
    await _messageController.close();
    connectionStateNotifier.dispose();
  }
}
