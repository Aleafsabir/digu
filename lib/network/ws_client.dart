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

  final ValueNotifier<WsConnectionState> connectionStateNotifier =
      ValueNotifier<WsConnectionState>(WsConnectionState.disconnected);

  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();

  HolhuashiWsClient({
    this.serverUrl = 'ws://localhost:8080/ws',
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

  // ---------------------------------------------------------------------------
  // Holhuashi Protocol Actions
  // ---------------------------------------------------------------------------

  /// Sends `ROOM_CREATE` to initialize a private or matchmaking table.
  void createRoom({
    required String profileId,
    required String displayName,
    String gameMode = 'digu',
    int targetScore = 500,
    int turnTimerSeconds = 15,
    bool fillEmptySeatsWithBots = true,
    String? preferredRoomCode,
  }) {
    _activeProfileId = profileId;
    if (preferredRoomCode != null) _activeRoomCode = preferredRoomCode;
    sendRaw({
      'type': 'ROOM_CREATE',
      'profileId': profileId,
      'displayName': displayName,
      'gameMode': gameMode,
      'targetScore': targetScore,
      'turnTimerSeconds': turnTimerSeconds,
      'fillEmptySeatsWithBots': fillEmptySeatsWithBots,
      if (preferredRoomCode != null) 'roomCode': preferredRoomCode,
    });
  }

  /// Sends `ROOM_JOIN` to join a 6-character (e.g., `MLD842`) or 4-digit room code.
  void joinRoom({
    required String roomCode,
    required String profileId,
    required String displayName,
    bool asSpectator = false,
  }) {
    _activeRoomCode = roomCode.toUpperCase();
    _activeProfileId = profileId;
    sendRaw({
      'type': 'ROOM_JOIN',
      'roomCode': _activeRoomCode,
      'profileId': profileId,
      'displayName': displayName,
      'asSpectator': asSpectator,
    });
  }

  /// Sends `ROOM_LEAVE` to exit the current room.
  void leaveRoom({String? roomCode}) {
    final code = roomCode ?? _activeRoomCode;
    if (code != null) {
      sendRaw({
        'type': 'ROOM_LEAVE',
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
    sendRaw({
      'type': 'SEAT_ASSIGN',
      'roomCode': roomCode,
      'seatIndex': seatIndex,
      'profileId': profileId ?? _activeProfileId,
    });
  }

  /// Sends `READY_TOGGLE` to mark player ready/unready in the waiting room.
  void toggleReady({
    required String roomCode,
    required bool isReady,
    String? profileId,
  }) {
    sendRaw({
      'type': 'READY_TOGGLE',
      'roomCode': roomCode,
      'isReady': isReady,
      'profileId': profileId ?? _activeProfileId,
    });
  }

  /// Sends `MATCH_START` from the room host.
  void startMatch({required String roomCode}) {
    sendRaw({
      'type': 'MATCH_START',
      'roomCode': roomCode,
    });
  }

  /// Sends `ACTION_SUBMIT` for card draw, discard, trick play, trump declaration, or Gin slam.
  void submitAction({
    required String roomCode,
    required String actionType,
    Map<String, dynamic> actionData = const {},
  }) {
    sendRaw({
      'type': 'ACTION_SUBMIT',
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
    sendRaw({
      'type': 'SYNC_RECONCILE',
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
    sendRaw({
      'type': 'QUICK_CHAT_EMOTE',
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
