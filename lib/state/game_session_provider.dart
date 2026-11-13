import 'dart:async';
import 'dart:math' as math;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/audio/sensory_service.dart';
import '../core/bondi/bondi_engine.dart' show BondiVariant;
import '../core/dhihaeh/dhihaeh_engine.dart' show DhihaehVariant;
import '../core/digu/digu_resolver.dart' show DiguTableFormat;
import '../core/services/cloud_sync_service.dart';
import '../core/services/friends_service.dart';
import '../core/services/google_auth_service.dart';
import '../data/local_persistence.dart';
import '../game/table_canvas.dart' show HolhuashiGameMode;
import '../network/ws_client.dart';

export '../core/bondi/bondi_engine.dart' show BondiVariant;
export '../core/dhihaeh/dhihaeh_engine.dart' show DhihaehVariant;
export '../core/digu/digu_resolver.dart' show DiguTableFormat;
export '../core/services/cloud_sync_service.dart'
    show CloudPlayerProfile, CloudProfileConflict, GoogleAuthSyncResult;
export '../core/services/friends_service.dart'
    show
        FriendEntry,
        FriendRequestEntry,
        FriendRequestsBundle,
        FriendsService,
        FriendsServiceException,
        MatchInviteEntry,
        PlayerLookupResult;
export '../core/services/google_auth_service.dart'
    show GoogleAuthOutcome, GoogleAuthStatus, GoogleAuthUser;
export '../game/table_canvas.dart' show HolhuashiGameMode;

/// Top-level navigation state for the Holhuashi application shell.
enum AppScreenState {
  auth,
  lobby,
  waitingRoom,
  inGame,
}

/// Supported authentication provider options for Holhuashi accounts.
enum AuthProviderType {
  none,
  guest,
  google,
  apple,
}

/// Cloud synchronization status for player profile and ratings.
enum CloudSyncState {
  offlineLocal,
  syncing,
  synced,
}

/// 4-Seat compass positions around the Maldivian Holhuashi table.
enum CompassSeat {
  south,
  east,
  north,
  west;

  String get label {
    switch (this) {
      case CompassSeat.south:
        return 'SOUTH';
      case CompassSeat.east:
        return 'EAST';
      case CompassSeat.north:
        return 'NORTH';
      case CompassSeat.west:
        return 'WEST';
    }
  }

  String get teamLabel {
    switch (this) {
      case CompassSeat.south:
      case CompassSeat.north:
        return 'TEAM A (YOU & PARTNER)';
      case CompassSeat.east:
      case CompassSeat.west:
        return 'TEAM B (OPPONENTS)';
    }
  }
}

/// Occupant state for a single compass seat in the Waiting Room & Table HUD.
class SeatOccupant {
  final CompassSeat seat;
  final String? profileId;
  final String displayName;
  final String? username;
  final String subtitle;
  final bool isHuman;
  final bool isBot;
  final bool isReady;
  final int elo;
  final String avatarId;

  const SeatOccupant({
    required this.seat,
    this.profileId,
    required this.displayName,
    this.username,
    required this.subtitle,
    this.isHuman = false,
    this.isBot = false,
    this.isReady = false,
    this.elo = 1250,
    this.avatarId = 'bot_island',
  });

  bool get isOpen => !isHuman && !isBot;

  factory SeatOccupant.open(
    CompassSeat seat, {
    String subtitle = 'OPEN SEAT',
  }) {
    return SeatOccupant(
      seat: seat,
      displayName: 'Open Seat',
      subtitle: subtitle,
      isHuman: false,
      isBot: false,
      isReady: false,
      elo: 1200,
      avatarId: 'open_seat',
    );
  }

  SeatOccupant copyWith({
    CompassSeat? seat,
    String? profileId,
    String? displayName,
    String? username,
    String? subtitle,
    bool? isHuman,
    bool? isBot,
    bool? isReady,
    int? elo,
    String? avatarId,
  }) {
    return SeatOccupant(
      seat: seat ?? this.seat,
      profileId: profileId ?? this.profileId,
      displayName: displayName ?? this.displayName,
      username: username ?? this.username,
      subtitle: subtitle ?? this.subtitle,
      isHuman: isHuman ?? this.isHuman,
      isBot: isBot ?? this.isBot,
      isReady: isReady ?? this.isReady,
      elo: elo ?? this.elo,
      avatarId: avatarId ?? this.avatarId,
    );
  }
}

/// Preset Maldivian Thaana + Latin quick-chat emote option.
class QuickChatPreset {
  final String id;
  final String thaana;
  final String latin;
  final String english;

  const QuickChatPreset({
    required this.id,
    required this.thaana,
    required this.latin,
    required this.english,
  });
}

/// Active quick-chat toast message displayed over the table.
class QuickChatMessage {
  final String id;
  final String senderName;
  final CompassSeat seat;
  final String thaana;
  final String latin;
  final DateTime timestamp;

  const QuickChatMessage({
    required this.id,
    required this.senderName,
    required this.seat,
    required this.thaana,
    required this.latin,
    required this.timestamp,
  });
}

/// Authentic Maldivian Holhuashi quick-chat phrases in Thaana and Latin script.
const List<QuickChatPreset> kHolhuashiQuickChatPresets = [
  QuickChatPreset(
    id: 'varah_reethi',
    thaana: 'ވަރަށް ރީތި!',
    latin: 'Varah Reethi!',
    english: 'Well Played!',
  ),
  QuickChatPreset(
    id: 'avaskoh_kulhey',
    thaana: 'އަވަސްކޮށް ކުޅޭ!',
    latin: 'Avaskoh Kulhey!',
    english: 'Play Fast!',
  ),
  QuickChatPreset(
    id: 'haasbagga',
    thaana: 'ހާސްބައްގަ!',
    latin: 'Haasbagga!',
    english: 'All four 10s sweep!',
  ),
  QuickChatPreset(
    id: 'digu_hama',
    thaana: 'ޑިގު ހަމަ!',
    latin: 'Digu Hama!',
    english: 'Gin / Full Hand!',
  ),
  QuickChatPreset(
    id: 'bondi_keiy',
    thaana: 'ބޮނޑި ކެއީ!',
    latin: 'Bondi Keiy!',
    english: 'Burned the pile!',
  ),
  QuickChatPreset(
    id: 'maaf_kuraathi',
    thaana: 'މާފު ކުރާތި!',
    latin: 'Maaf Kuraathi!',
    english: 'Sorry Partner!',
  ),
];

/// Immutable state container for the active Holhuashi session, lobby, waiting room,
/// user settings, and quick-chat overlay.
class GameSessionState {
  final AppScreenState screenState;
  final HolhuashiGameMode selectedMode;
  final String guestUuid;
  final String? cloudProfileId;
  final String displayName;
  final String? username;
  final String avatarId;
  final int coins;
  final int stakeBuyIn;
  final Map<String, int> eloByMode;
  final String roomCode;
  final bool isPrivateRoom;
  final int targetScore; // 500 or 1000
  final int turnTimerSeconds; // 15 or 30
  final bool fillEmptySeatsWithBots;
  final int spectatorCount;
  final Map<CompassSeat, SeatOccupant> seats;
  final UserSettings settings;
  final QuickChatMessage? activeQuickChat;
  final List<QuickChatMessage> quickChatHistory;
  final List<OfflineMatchRecord> matchHistory;
  final WsConnectionState wsConnectionState;
  final AuthProviderType authProvider;
  final CloudSyncState cloudSyncState;
  final String? userEmail;
  final String? friendCode;
  final HolhuashiGameMode lastPlayedMode;
  final int readyCheckSecondsRemaining;
  final bool isReadyCheckActive;
  final String? matchmakingNotification;
  final bool authBusy;
  final String? authErrorMessage;
  final CloudProfileConflict? pendingCloudConflict;
  final DiguTableFormat diguFormat;
  final BondiVariant bondiVariant;
  final DhihaehVariant dhihaehVariant;
  final List<FriendEntry> friends;
  final List<FriendRequestEntry> incomingFriendRequests;
  final List<FriendRequestEntry> outgoingFriendRequests;
  final bool friendsLoading;
  final String? friendsError;
  final MatchInviteEntry? pendingMatchInvite;

  const GameSessionState({
    this.screenState = AppScreenState.auth,
    this.selectedMode = HolhuashiGameMode.digu,
    this.guestUuid = 'guest-local-0001',
    this.cloudProfileId,
    this.displayName = 'Raaveriyaa',
    this.username,
    this.avatarId = 'maldivian_captain',
    this.coins = 2450,
    this.stakeBuyIn = 1000,
    this.eloByMode = LocalPersistenceRepository.defaultEloMap,
    this.roomCode = 'MLD842',
    this.isPrivateRoom = true,
    this.targetScore = 1000,
    this.turnTimerSeconds = 15,
    this.fillEmptySeatsWithBots = false,
    this.spectatorCount = 0,
    required this.seats,
    this.settings = const UserSettings(),
    this.activeQuickChat,
    this.quickChatHistory = const [],
    this.matchHistory = const [],
    this.wsConnectionState = WsConnectionState.disconnected,
    this.authProvider = AuthProviderType.none,
    this.cloudSyncState = CloudSyncState.offlineLocal,
    this.userEmail,
    this.friendCode,
    this.lastPlayedMode = HolhuashiGameMode.digu,
    this.readyCheckSecondsRemaining = 15,
    this.isReadyCheckActive = false,
    this.matchmakingNotification,
    this.authBusy = false,
    this.authErrorMessage,
    this.pendingCloudConflict,
    this.diguFormat = DiguTableFormat.partners2v2,
    this.bondiVariant = BondiVariant.standard,
    this.dhihaehVariant = DhihaehVariant.dynamicCut,
    this.friends = const [],
    this.incomingFriendRequests = const [],
    this.outgoingFriendRequests = const [],
    this.friendsLoading = false,
    this.friendsError,
    this.pendingMatchInvite,
  });

  String get effectiveProfileId =>
      (cloudProfileId != null && cloudProfileId!.isNotEmpty)
          ? cloudProfileId!
          : guestUuid;

  int get requiredSeatCount =>
      (selectedMode == HolhuashiGameMode.digu &&
              diguFormat == DiguTableFormat.duel1v1)
          ? 2
          : 4;

  List<CompassSeat> get activeCompassOrder => requiredSeatCount == 2
      ? const [CompassSeat.south, CompassSeat.north]
      : const [
          CompassSeat.south,
          CompassSeat.east,
          CompassSeat.north,
          CompassSeat.west,
        ];

  int get humanSeatCount =>
      activeCompassOrder.where((s) => seats[s]?.isHuman == true).length;

  int get filledSeatCount =>
      activeCompassOrder.where((s) => !(seats[s]?.isOpen ?? true)).length;

  bool get isTableFullOfHumans => humanSeatCount >= requiredSeatCount;

  bool get canStartPrivateMatch =>
      isPrivateRoom &&
      southSeat.isReady &&
      (fillEmptySeatsWithBots
          ? allFilledSeatsReady
          : isTableFullOfHumans && allFilledSeatsReady);

  int get pendingFriendRequestCount => incomingFriendRequests.length;

  factory GameSessionState.initial({
    String? initialRoomCode,
    AppScreenState? initialScreen,
  }) {
    final deepLinkedRoom = initialRoomCode ?? _parseDeepLinkRoomCode();
    final room = (deepLinkedRoom != null && deepLinkedRoom.isNotEmpty)
        ? deepLinkedRoom
        : 'MLD842';
    final screen = initialScreen ??
        (deepLinkedRoom != null
            ? AppScreenState.waitingRoom
            : AppScreenState.auth);

    return GameSessionState(
      screenState: screen,
      roomCode: room,
      seats: defaultSeatsForPlayer('Raaveriyaa', 1284, fillBots: false),
    );
  }

  static Map<CompassSeat, SeatOccupant> defaultSeatsForPlayer(
    String playerName,
    int playerElo, {
    String? profileId,
    String? username,
    String avatarId = 'maldivian_captain',
    bool southReady = false,
    bool botsReady = true,
    bool fillBots = false,
  }) {
    return {
      CompassSeat.south: SeatOccupant(
        seat: CompassSeat.south,
        profileId: profileId,
        displayName: playerName,
        username: username,
        subtitle: 'YOU • HOST',
        isHuman: true,
        isBot: false,
        isReady: southReady,
        elo: playerElo,
        avatarId: avatarId,
      ),
      CompassSeat.north: fillBots
          ? SeatOccupant(
              seat: CompassSeat.north,
              displayName: 'Aishath',
              subtitle: 'NORTH • AI',
              isHuman: false,
              isBot: true,
              isReady: botsReady,
              elo: 1310,
              avatarId: 'partner_island',
            )
          : SeatOccupant.open(CompassSeat.north),
      CompassSeat.east: fillBots
          ? SeatOccupant(
              seat: CompassSeat.east,
              displayName: 'Hussain',
              subtitle: 'EAST • AI',
              isHuman: false,
              isBot: true,
              isReady: botsReady,
              elo: 1290,
              avatarId: 'east_island',
            )
          : SeatOccupant.open(CompassSeat.east),
      CompassSeat.west: fillBots
          ? SeatOccupant(
              seat: CompassSeat.west,
              displayName: 'Ibrahim',
              subtitle: 'WEST • AI',
              isHuman: false,
              isBot: true,
              isReady: botsReady,
              elo: 1265,
              avatarId: 'west_island',
            )
          : SeatOccupant.open(CompassSeat.west),
    };
  }

  static String? _parseDeepLinkRoomCode() {
    try {
      final raw = Uri.base.queryParameters['room']?.trim().toUpperCase();
      if (raw != null && raw.length >= 4 && raw.length <= 8) {
        return raw;
      }
    } catch (_) {}
    return null;
  }

  // Convenience getters for UI screens
  double get sfxVolume => settings.sfxVolume;
  double get bgmVolume => settings.bgmVolume;
  bool get hapticsEnabled => settings.hapticsEnabled;
  bool get screenShakeEnabled => settings.screenShakeEnabled;
  bool get fastDealSpeed => settings.fastDealSpeed;
  bool get googleLinked => settings.googleLinked;
  bool get appleLinked => settings.appleLinked;
  bool get isCloudSynced =>
      authProvider == AuthProviderType.google ||
      authProvider == AuthProviderType.apple;
  String get authStatusLabel => authProvider == AuthProviderType.google
      ? 'GOOGLE SYNCED'
      : authProvider == AuthProviderType.apple
          ? 'APPLE SYNCED'
          : 'GUEST (LOCAL ONLY)';

  int get diguElo => eloByMode['digu'] ?? 1284;
  int get dhihaehElo => eloByMode['dhihaeh'] ?? 1320;
  int get bondiElo => eloByMode['bondi'] ?? 1195;

  int eloForMode(HolhuashiGameMode mode) {
    switch (mode) {
      case HolhuashiGameMode.digu:
        return diguElo;
      case HolhuashiGameMode.dhihaeh:
        return dhihaehElo;
      case HolhuashiGameMode.bondi:
        return bondiElo;
    }
  }

  String get shareableInviteLink => 'https://holhuashi.mv/?room=$roomCode';

  SeatOccupant get southSeat => seats[CompassSeat.south]!;
  SeatOccupant get eastSeat => seats[CompassSeat.east]!;
  SeatOccupant get northSeat => seats[CompassSeat.north]!;
  SeatOccupant get westSeat => seats[CompassSeat.west]!;

  bool get allFilledSeatsReady {
    for (final seatKey in activeCompassOrder) {
      final occupant = seats[seatKey];
      if (occupant == null || occupant.isOpen) {
        if (!fillEmptySeatsWithBots) continue;
        return false;
      }
      if (!occupant.isReady) {
        return false;
      }
    }
    return true;
  }

  GameSessionState copyWith({
    AppScreenState? screenState,
    HolhuashiGameMode? selectedMode,
    String? guestUuid,
    String? cloudProfileId,
    bool clearCloudProfileId = false,
    String? displayName,
    String? username,
    bool clearUsername = false,
    String? avatarId,
    int? coins,
    int? stakeBuyIn,
    Map<String, int>? eloByMode,
    String? roomCode,
    bool? isPrivateRoom,
    int? targetScore,
    int? turnTimerSeconds,
    bool? fillEmptySeatsWithBots,
    int? spectatorCount,
    Map<CompassSeat, SeatOccupant>? seats,
    UserSettings? settings,
    QuickChatMessage? activeQuickChat,
    bool clearActiveQuickChat = false,
    List<QuickChatMessage>? quickChatHistory,
    List<OfflineMatchRecord>? matchHistory,
    WsConnectionState? wsConnectionState,
    AuthProviderType? authProvider,
    CloudSyncState? cloudSyncState,
    String? userEmail,
    bool clearUserEmail = false,
    String? friendCode,
    HolhuashiGameMode? lastPlayedMode,
    int? readyCheckSecondsRemaining,
    bool? isReadyCheckActive,
    String? matchmakingNotification,
    bool clearMatchmakingNotification = false,
    bool? authBusy,
    String? authErrorMessage,
    bool clearAuthErrorMessage = false,
    CloudProfileConflict? pendingCloudConflict,
    bool clearPendingCloudConflict = false,
    DiguTableFormat? diguFormat,
    BondiVariant? bondiVariant,
    DhihaehVariant? dhihaehVariant,
    List<FriendEntry>? friends,
    List<FriendRequestEntry>? incomingFriendRequests,
    List<FriendRequestEntry>? outgoingFriendRequests,
    bool? friendsLoading,
    String? friendsError,
    bool clearFriendsError = false,
    MatchInviteEntry? pendingMatchInvite,
    bool clearPendingMatchInvite = false,
  }) {
    return GameSessionState(
      screenState: screenState ?? this.screenState,
      selectedMode: selectedMode ?? this.selectedMode,
      guestUuid: guestUuid ?? this.guestUuid,
      cloudProfileId:
          clearCloudProfileId ? null : (cloudProfileId ?? this.cloudProfileId),
      displayName: displayName ?? this.displayName,
      username: clearUsername ? null : (username ?? this.username),
      avatarId: avatarId ?? this.avatarId,
      coins: coins ?? this.coins,
      stakeBuyIn: stakeBuyIn ?? this.stakeBuyIn,
      eloByMode: eloByMode ?? this.eloByMode,
      roomCode: roomCode ?? this.roomCode,
      isPrivateRoom: isPrivateRoom ?? this.isPrivateRoom,
      targetScore: targetScore ?? this.targetScore,
      turnTimerSeconds: turnTimerSeconds ?? this.turnTimerSeconds,
      fillEmptySeatsWithBots:
          fillEmptySeatsWithBots ?? this.fillEmptySeatsWithBots,
      spectatorCount: spectatorCount ?? this.spectatorCount,
      seats: seats ?? this.seats,
      settings: settings ?? this.settings,
      activeQuickChat:
          clearActiveQuickChat ? null : (activeQuickChat ?? this.activeQuickChat),
      quickChatHistory: quickChatHistory ?? this.quickChatHistory,
      matchHistory: matchHistory ?? this.matchHistory,
      wsConnectionState: wsConnectionState ?? this.wsConnectionState,
      authProvider: authProvider ?? this.authProvider,
      cloudSyncState: cloudSyncState ?? this.cloudSyncState,
      userEmail: clearUserEmail ? null : (userEmail ?? this.userEmail),
      friendCode: friendCode ?? this.friendCode,
      lastPlayedMode: lastPlayedMode ?? this.lastPlayedMode,
      readyCheckSecondsRemaining:
          readyCheckSecondsRemaining ?? this.readyCheckSecondsRemaining,
      isReadyCheckActive: isReadyCheckActive ?? this.isReadyCheckActive,
      matchmakingNotification: clearMatchmakingNotification
          ? null
          : (matchmakingNotification ?? this.matchmakingNotification),
      authBusy: authBusy ?? this.authBusy,
      authErrorMessage: clearAuthErrorMessage
          ? null
          : (authErrorMessage ?? this.authErrorMessage),
      pendingCloudConflict: clearPendingCloudConflict
          ? null
          : (pendingCloudConflict ?? this.pendingCloudConflict),
      diguFormat: diguFormat ?? this.diguFormat,
      bondiVariant: bondiVariant ?? this.bondiVariant,
      dhihaehVariant: dhihaehVariant ?? this.dhihaehVariant,
      friends: friends ?? this.friends,
      incomingFriendRequests:
          incomingFriendRequests ?? this.incomingFriendRequests,
      outgoingFriendRequests:
          outgoingFriendRequests ?? this.outgoingFriendRequests,
      friendsLoading: friendsLoading ?? this.friendsLoading,
      friendsError:
          clearFriendsError ? null : (friendsError ?? this.friendsError),
      pendingMatchInvite: clearPendingMatchInvite
          ? null
          : (pendingMatchInvite ?? this.pendingMatchInvite),
    );
  }
}

/// Riverpod [StateNotifier] orchestrating Lobby <-> Waiting Room <-> In-Game
/// transitions, room code generation, 4-seat management, settings persistence,
/// sensory synchronization, and quick-chat state.
class GameSessionNotifier extends StateNotifier<GameSessionState> {
  static const String _roomCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  final LocalPersistenceRepository _persistence;
  final SensoryService _sensory;
  final HolhuashiWsClient _wsClient;
  final bool _ownsWsClient;
  final GoogleAuthService _googleAuthService;
  final CloudSyncService _cloudSyncService;
  final FriendsService _friendsService;
  final Duration _readyCheckDuration;
  Timer? _quickChatDismissTimer;
  Timer? _readyCheckTimer;
  Timer? _inviteExpiryTimer;
  StreamSubscription<Map<String, dynamic>>? _wsSub;
  final List<Timer> _botStaggerTimers = [];

  GameSessionNotifier({
    LocalPersistenceRepository? persistence,
    SensoryService? sensory,
    HolhuashiWsClient? wsClient,
    GoogleAuthService? googleAuthService,
    CloudSyncService? cloudSyncService,
    FriendsService? friendsService,
    Duration readyCheckDuration = const Duration(seconds: 15),
    GameSessionState? initialState,
  })  : _persistence = persistence ?? LocalPersistenceRepository(),
        _sensory = sensory ?? SensoryService.instance,
        _ownsWsClient = wsClient == null,
        _wsClient = wsClient ?? HolhuashiWsClient(autoReconnect: true),
        _googleAuthService = googleAuthService ?? GoogleAuthService(),
        _cloudSyncService = cloudSyncService ?? CloudSyncService(),
        _friendsService = friendsService ?? FriendsService(),
        _readyCheckDuration = readyCheckDuration,
        super(initialState ?? GameSessionState.initial()) {
    _bindWsListeners();
    _hydrateFromStorage();
  }

  HolhuashiWsClient get wsClient => _wsClient;
  LocalPersistenceRepository get persistence => _persistence;
  SensoryService get sensory => _sensory;
  GoogleAuthService get googleAuthService => _googleAuthService;
  CloudSyncService get cloudSyncService => _cloudSyncService;
  FriendsService get friendsService => _friendsService;

  void _bindWsListeners() {
    _wsClient.connectionStateNotifier.addListener(_onWsConnectionChanged);
    _wsSub = _wsClient.messages.listen(_handleWsMessage);
  }

  void _onWsConnectionChanged() {
    if (!mounted) return;
    final next = _wsClient.connectionStateNotifier.value;
    if (next != state.wsConnectionState) {
      state = state.copyWith(wsConnectionState: next);
    }
    if (next == WsConnectionState.connected &&
        state.authProvider != AuthProviderType.none) {
      _wsClient.authenticate(
        profileId: state.effectiveProfileId,
        displayName: state.displayName,
        username: state.username,
        loginProvider: state.authProvider == AuthProviderType.google
            ? 'GOOGLE'
            : state.authProvider == AuthProviderType.apple
                ? 'APPLE'
                : 'GUEST',
        avatarId: state.avatarId,
        friendCode: state.friendCode,
      );
    }
  }

  Future<void> _ensureWsAuthenticated() async {
    if (!_wsClient.isConnected) {
      await _wsClient.connect(profileId: state.effectiveProfileId);
    }
    if (!mounted) return;
    if (_wsClient.isConnected) {
      _wsClient.authenticate(
        profileId: state.effectiveProfileId,
        displayName: state.displayName,
        username: state.username,
        loginProvider: state.authProvider == AuthProviderType.google
            ? 'GOOGLE'
            : state.authProvider == AuthProviderType.apple
                ? 'APPLE'
                : 'GUEST',
        avatarId: state.avatarId,
        friendCode: state.friendCode,
      );
    }
  }

  String _currentVariantWireKey(HolhuashiGameMode mode) {
    switch (mode) {
      case HolhuashiGameMode.digu:
        switch (state.diguFormat) {
          case DiguTableFormat.duel1v1:
            return '1v1';
          case DiguTableFormat.partners2v2:
            return '2v2';
          case DiguTableFormat.freeForAll4p:
            return '4p_solo';
        }
      case HolhuashiGameMode.bondi:
        return state.bondiVariant.name;
      case HolhuashiGameMode.dhihaeh:
        return state.dhihaehVariant.name;
    }
  }

  String _serverModeWireKey(HolhuashiGameMode mode) {
    switch (mode) {
      case HolhuashiGameMode.digu:
        return 'DIGU';
      case HolhuashiGameMode.dhihaeh:
        return 'DHIHAEH';
      case HolhuashiGameMode.bondi:
        return 'BONDI';
    }
  }

  Map<String, dynamic> _wsProfilePayload() {
    return {
      'id': state.effectiveProfileId,
      'displayName': state.displayName,
      if (state.username != null && state.username!.isNotEmpty)
        'username': state.username,
      'avatarId': state.avatarId,
      'elo': state.eloForMode(state.selectedMode),
    };
  }

  Future<void> _hydrateFromStorage() async {
    try {
      final profile = await _persistence.ensureGuestProfileInitialized();
      final settings = await _persistence.loadSettings();
      final history = await _persistence.loadMatchHistory();
      final storedCloudId = await _persistence.getCloudProfileId();
      final storedUsername = profile.username ?? await _persistence.getUsername();
      _sensory.applySettings(settings);

      if (!mounted) return;
      if (state.authProvider != AuthProviderType.none ||
          state.screenState != AppScreenState.auth ||
          state.isCloudSynced) {
        return;
      }
      final parsedAuthProvider = _parseAuthProvider(settings.authProvider);
      final parsedLastPlayedMode = _parseGameMode(settings.lastPlayedMode);
      final isSignedIn = parsedAuthProvider != AuthProviderType.none;
      final restoredCloudSync =
          (parsedAuthProvider == AuthProviderType.google ||
                  parsedAuthProvider == AuthProviderType.apple)
              ? CloudSyncState.synced
              : CloudSyncState.offlineLocal;
      final nextScreenState =
          (isSignedIn && state.screenState == AppScreenState.auth)
              ? AppScreenState.lobby
              : state.screenState;

      final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
      final currentSouth = updatedSeats[CompassSeat.south];
      if (currentSouth != null) {
        updatedSeats[CompassSeat.south] = currentSouth.copyWith(
          profileId: storedCloudId ?? profile.uuid,
          displayName: profile.displayName,
          username: storedUsername,
          elo: profile.eloByMode[state.selectedMode.name] ?? 1284,
        );
      }

      state = state.copyWith(
        guestUuid: profile.uuid,
        cloudProfileId: storedCloudId,
        displayName: profile.displayName,
        username: storedUsername,
        avatarId: profile.avatarId,
        coins: profile.coins,
        eloByMode: profile.eloByMode,
        friendCode: profile.friendCode,
        settings: settings,
        seats: updatedSeats,
        matchHistory: history,
        authProvider: isSignedIn ? parsedAuthProvider : state.authProvider,
        cloudSyncState:
            isSignedIn ? restoredCloudSync : state.cloudSyncState,
        userEmail: isSignedIn ? settings.userEmail : state.userEmail,
        lastPlayedMode: parsedLastPlayedMode,
        screenState: nextScreenState,
      );

      if (restoredCloudSync == CloudSyncState.synced) {
        unawaited(_ensureWsAuthenticated());
        unawaited(refreshFriendsAndRequests());
      }
    } catch (_) {
      // Safe fallback in test environments where SharedPreferences mock is not yet set
    }
  }

  static AuthProviderType _parseAuthProvider(String raw) {
    switch (raw.toLowerCase()) {
      case 'google':
        return AuthProviderType.google;
      case 'apple':
        return AuthProviderType.apple;
      case 'guest':
        return AuthProviderType.guest;
      case 'none':
      default:
        return AuthProviderType.none;
    }
  }

  static HolhuashiGameMode _parseGameMode(String raw) {
    switch (raw.toLowerCase()) {
      case 'dhihaeh':
        return HolhuashiGameMode.dhihaeh;
      case 'bondi':
        return HolhuashiGameMode.bondi;
      case 'digu':
      default:
        return HolhuashiGameMode.digu;
    }
  }

  // ---------------------------------------------------------------------------
  // Authentication & Cloud Sync
  // ---------------------------------------------------------------------------

  CloudPlayerProfile _buildLocalCloudProfileSnapshot() {
    final totalGames = state.matchHistory.length;
    final totalWins = state.matchHistory.where((m) => m.won).length;
    return CloudPlayerProfile(
      id: state.effectiveProfileId,
      displayName: state.displayName,
      username: state.username,
      avatarId: state.avatarId,
      loginProvider:
          state.authProvider == AuthProviderType.google ? 'GOOGLE' : 'GUEST',
      email: state.userEmail,
      coins: state.coins,
      friendCode: state.friendCode,
      stats: {
        'gamesPlayed': totalGames,
        'gamesWon': totalWins,
      },
      cloudSyncStatus: state.isCloudSynced ? 'SYNCED' : 'OFFLINE',
    );
  }

  Future<void> _applySyncedCloudProfile(
    CloudPlayerProfile profile, {
    required String fallbackEmail,
  }) async {
    final resolvedName = profile.displayName.trim().isNotEmpty
        ? profile.displayName.trim()
        : state.displayName;
    final resolvedUsername =
        (profile.username != null && profile.username!.trim().isNotEmpty)
            ? profile.username!.trim()
            : state.username;
    final resolvedCloudId =
        profile.id.trim().isNotEmpty ? profile.id.trim() : state.cloudProfileId;
    final resolvedEmail =
        (profile.email != null && profile.email!.trim().isNotEmpty)
            ? profile.email!.trim()
            : fallbackEmail;

    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final south = updatedSeats[CompassSeat.south];
    if (south != null) {
      updatedSeats[CompassSeat.south] = south.copyWith(
        profileId: resolvedCloudId ?? state.effectiveProfileId,
        displayName: resolvedName,
        username: resolvedUsername,
      );
    }

    state = state.copyWith(
      authProvider: AuthProviderType.google,
      cloudSyncState: CloudSyncState.synced,
      cloudProfileId: resolvedCloudId,
      userEmail: resolvedEmail,
      displayName: resolvedName,
      username: resolvedUsername,
      avatarId: profile.avatarId,
      coins: profile.coins,
      friendCode: profile.friendCode ?? state.friendCode,
      seats: updatedSeats,
      authBusy: false,
      clearAuthErrorMessage: true,
      clearPendingCloudConflict: true,
      screenState: AppScreenState.lobby,
    );

    await _updateSettings(
      state.settings.copyWith(
        googleLinked: true,
        authProvider: 'google',
        userEmail: resolvedEmail,
      ),
    );
    try {
      await _persistence.setCloudProfileId(resolvedCloudId);
      await _persistence.setUsername(resolvedUsername);
      await _persistence.setDisplayName(resolvedName);
      await _persistence.setAvatarId(profile.avatarId);
      await _persistence.setCoins(profile.coins);
      if (profile.friendCode != null) {
        await _persistence.setFriendCode(profile.friendCode);
      }
    } catch (_) {}

    unawaited(_ensureWsAuthenticated());
    unawaited(refreshFriendsAndRequests());
  }

  Future<bool> signInWithGoogle() async {
    if (state.authBusy) return false;
    _sensory.lightImpact();

    state = state.copyWith(
      authBusy: true,
      clearAuthErrorMessage: true,
      clearPendingCloudConflict: true,
    );

    final outcome = await _googleAuthService.signIn();
    if (!mounted) return false;

    if (outcome.isCancelled) {
      state = state.copyWith(authBusy: false);
      return false;
    }

    if (outcome.isFailure || outcome.user == null) {
      state = state.copyWith(
        authBusy: false,
        authErrorMessage:
            outcome.errorMessage ?? 'Google Sign-In failed. Please try again.',
      );
      return false;
    }

    final googleUser = outcome.user!;
    state = state.copyWith(cloudSyncState: CloudSyncState.syncing);

    try {
      final localSnapshot = _buildLocalCloudProfileSnapshot();
      final syncResult = await _cloudSyncService.authenticateWithGoogle(
        googleUser: googleUser,
        localProfile: localSnapshot,
      );
      if (!mounted) return false;

      if (syncResult.hasConflict) {
        state = state.copyWith(
          authBusy: false,
          cloudSyncState: CloudSyncState.offlineLocal,
          userEmail: googleUser.email,
          pendingCloudConflict: syncResult.conflict,
        );
        return false;
      }

      await _applySyncedCloudProfile(
        syncResult.profile,
        fallbackEmail: googleUser.email,
      );
      return true;
    } on CloudSyncException catch (e) {
      if (!mounted) return false;
      state = state.copyWith(
        authBusy: false,
        cloudSyncState: CloudSyncState.offlineLocal,
        authErrorMessage: e.message,
      );
      return false;
    } catch (_) {
      if (!mounted) return false;
      state = state.copyWith(
        authBusy: false,
        cloudSyncState: CloudSyncState.offlineLocal,
        authErrorMessage:
            'Could not reach cloud profile service. Please try again.',
      );
      return false;
    }
  }

  Future<void> resolveCloudConflict({
    required bool keepCloud,
    required bool mergeChips,
  }) async {
    final conflict = state.pendingCloudConflict;
    if (conflict == null || state.authBusy) return;

    state = state.copyWith(
      authBusy: true,
      cloudSyncState: CloudSyncState.syncing,
      clearAuthErrorMessage: true,
    );

    try {
      final resolvedProfile = await _cloudSyncService.resolveConflict(
        choice: keepCloud ? 'cloud' : 'local',
        mergeChips: mergeChips,
        cloudProfile: conflict.cloudProfile,
        localProfile: conflict.localProfile,
      );
      if (!mounted) return;

      await _applySyncedCloudProfile(
        resolvedProfile,
        fallbackEmail: conflict.cloudProfile.email ?? state.userEmail ?? '',
      );
    } on CloudSyncException catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        authBusy: false,
        cloudSyncState: CloudSyncState.offlineLocal,
        authErrorMessage: e.message,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        authBusy: false,
        cloudSyncState: CloudSyncState.offlineLocal,
        authErrorMessage: 'Failed to resolve save conflict. Please try again.',
      );
    }
  }

  void clearAuthError() {
    state = state.copyWith(clearAuthErrorMessage: true);
  }

  Future<void> signInWithApple({
    String displayName = 'Ibrahim Solih',
    String email = 'ibrahim@icloud.com',
  }) async {
    _sensory.lightImpact();
    final resolvedName =
        displayName.trim().isEmpty ? 'Ibrahim Solih' : displayName.trim();
    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final south = updatedSeats[CompassSeat.south];
    if (south != null) {
      updatedSeats[CompassSeat.south] = south.copyWith(
        displayName: resolvedName,
      );
    }

    state = state.copyWith(
      authProvider: AuthProviderType.apple,
      cloudSyncState: CloudSyncState.synced,
      userEmail: email,
      displayName: resolvedName,
      seats: updatedSeats,
      clearAuthErrorMessage: true,
      clearPendingCloudConflict: true,
      screenState: AppScreenState.lobby,
    );

    await _updateSettings(
      state.settings.copyWith(
        appleLinked: true,
        authProvider: 'apple',
        userEmail: email,
      ),
    );
    try {
      await _persistence.setDisplayName(resolvedName);
    } catch (_) {}
  }

  Future<void> signInAsGuest({String? displayName}) async {
    _sensory.lightImpact();
    final trimmed = displayName?.trim();
    final hasCustomName = trimmed != null && trimmed.isNotEmpty;
    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    if (hasCustomName) {
      final south = updatedSeats[CompassSeat.south];
      if (south != null) {
        updatedSeats[CompassSeat.south] = south.copyWith(displayName: trimmed);
      }
    }

    state = state.copyWith(
      authProvider: AuthProviderType.guest,
      cloudSyncState: CloudSyncState.offlineLocal,
      displayName: hasCustomName ? trimmed : state.displayName,
      seats: updatedSeats,
      clearAuthErrorMessage: true,
      clearPendingCloudConflict: true,
      screenState: AppScreenState.lobby,
    );

    await _updateSettings(
      state.settings.copyWith(authProvider: 'guest'),
    );
    if (hasCustomName) {
      try {
        await _persistence.setDisplayName(trimmed);
      } catch (_) {}
    }
  }

  Future<void> signOut() async {
    _sensory.selectionClick();
    _cancelReadyGateTimers();
    _inviteExpiryTimer?.cancel();
    unawaited(_wsClient.disconnect());
    await _googleAuthService.signOut();
    if (!mounted) return;

    state = state.copyWith(
      authProvider: AuthProviderType.none,
      cloudSyncState: CloudSyncState.offlineLocal,
      clearCloudProfileId: true,
      clearUsername: true,
      clearUserEmail: true,
      friends: const [],
      incomingFriendRequests: const [],
      outgoingFriendRequests: const [],
      clearPendingMatchInvite: true,
      authBusy: false,
      clearAuthErrorMessage: true,
      clearPendingCloudConflict: true,
      isReadyCheckActive: false,
      screenState: AppScreenState.auth,
    );

    try {
      await _persistence.setCloudProfileId(null);
      await _persistence.setUsername(null);
    } catch (_) {}

    await _updateSettings(
      state.settings.copyWith(
        authProvider: 'none',
        googleLinked: false,
        appleLinked: false,
        clearUserEmail: true,
      ),
    );
  }

  /// Generates an unambiguous 6-character alphanumeric room code (e.g., `MLD842`).
  static String generateRoomCode([math.Random? random]) {
    final rng = random ?? math.Random();
    return List.generate(
      6,
      (_) => _roomCodeAlphabet[rng.nextInt(_roomCodeAlphabet.length)],
    ).join();
  }

  // ---------------------------------------------------------------------------
  // Navigation, Mode Selection & 15s Matchmaking Ready Gate
  // ---------------------------------------------------------------------------

  int get _initialReadyCheckSeconds =>
      _readyCheckDuration.inSeconds >= 1 ? _readyCheckDuration.inSeconds : 1;

  void _cancelReadyGateTimers() {
    _readyCheckTimer?.cancel();
    _readyCheckTimer = null;
    for (final timer in _botStaggerTimers) {
      timer.cancel();
    }
    _botStaggerTimers.clear();
  }

  void setStakeBuyIn(int stake) {
    _sensory.selectionClick();
    state = state.copyWith(stakeBuyIn: stake);
  }

  void selectGameMode(HolhuashiGameMode mode) {
    _sensory.selectionClick();
    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final south = updatedSeats[CompassSeat.south];
    if (south != null) {
      updatedSeats[CompassSeat.south] = south.copyWith(
        elo: state.eloForMode(mode),
      );
    }
    state = state.copyWith(
      selectedMode: mode,
      seats: updatedSeats,
    );
  }

  void goToLobby() {
    _sensory.selectionClick();
    _cancelReadyGateTimers();
    if (_wsClient.isConnected) {
      _wsClient.updatePresence(status: 'IN_LOBBY');
    }
    state = state.copyWith(
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      screenState: AppScreenState.lobby,
    );
  }

  void returnToLobby() => goToLobby();

  /// Instant offline solo AI table launch (zero matchmaking queue delay).
  void startOfflineAiMatch([HolhuashiGameMode? mode]) {
    _sensory.mediumImpact();
    _cancelReadyGateTimers();
    final nextMode = mode ?? state.selectedMode;
    final seats = GameSessionState.defaultSeatsForPlayer(
      state.displayName,
      state.eloForMode(nextMode),
      profileId: state.effectiveProfileId,
      username: state.username,
      avatarId: state.avatarId,
      southReady: true,
      botsReady: true,
      fillBots: true,
    );

    state = state.copyWith(
      selectedMode: nextMode,
      lastPlayedMode: nextMode,
      isPrivateRoom: false,
      fillEmptySeatsWithBots: true,
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      seats: seats,
      clearMatchmakingNotification: true,
      screenState: AppScreenState.inGame,
    );

    unawaited(
      _updateSettings(
        state.settings.copyWith(lastPlayedMode: nextMode.name),
      ),
    );
    if (_wsClient.isConnected) {
      _wsClient.updatePresence(
        status: 'IN_MATCH',
        matchInfo: {
          'mode': _serverModeWireKey(nextMode),
          'variant': _currentVariantWireKey(nextMode),
        },
      );
    }
  }

  /// Stage-1 Online Public Queue: strictly 0 AI bots, real players only.
  void enterOnlineQueue([HolhuashiGameMode? mode]) {
    _sensory.lightImpact();
    _cancelReadyGateTimers();
    final nextMode = mode ?? state.selectedMode;
    final seats = GameSessionState.defaultSeatsForPlayer(
      state.displayName,
      state.eloForMode(nextMode),
      profileId: state.effectiveProfileId,
      username: state.username,
      avatarId: state.avatarId,
      southReady: false,
      fillBots: false,
    );

    state = state.copyWith(
      selectedMode: nextMode,
      lastPlayedMode: nextMode,
      isPrivateRoom: false,
      fillEmptySeatsWithBots: false,
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      seats: seats,
      clearMatchmakingNotification: true,
      screenState: AppScreenState.waitingRoom,
    );

    unawaited(
      _updateSettings(
        state.settings.copyWith(lastPlayedMode: nextMode.name),
      ),
    );
    unawaited(_connectAndJoinPublicQueue(nextMode));
  }

  Future<void> _connectAndJoinPublicQueue(HolhuashiGameMode mode) async {
    await _ensureWsAuthenticated();
    if (!mounted ||
        state.screenState != AppScreenState.waitingRoom ||
        state.isPrivateRoom) {
      return;
    }
    if (_wsClient.isConnected) {
      _wsClient.matchmakeJoin(
        profile: _wsProfilePayload(),
        mode: _serverModeWireKey(mode),
        variant: _currentVariantWireKey(mode),
        stakeBuyIn: state.stakeBuyIn,
        targetScore: state.targetScore,
        turnTimerSeconds: state.turnTimerSeconds,
      );
    }
  }

  /// Creates a Private Room with open seats by default (AI fill opt-in only).
  void createPrivateRoom([HolhuashiGameMode? mode]) {
    _sensory.lightImpact();
    _cancelReadyGateTimers();
    final nextMode = mode ?? state.selectedMode;
    final nextCode = generateRoomCode();
    final seats = GameSessionState.defaultSeatsForPlayer(
      state.displayName,
      state.eloForMode(nextMode),
      profileId: state.effectiveProfileId,
      username: state.username,
      avatarId: state.avatarId,
      southReady: true,
      fillBots: false,
    );

    state = state.copyWith(
      selectedMode: nextMode,
      lastPlayedMode: nextMode,
      roomCode: nextCode,
      isPrivateRoom: true,
      fillEmptySeatsWithBots: false,
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      seats: seats,
      clearMatchmakingNotification: true,
      screenState: AppScreenState.waitingRoom,
    );

    unawaited(
      _updateSettings(
        state.settings.copyWith(lastPlayedMode: nextMode.name),
      ),
    );
    unawaited(_connectAndCreatePrivateRoom(nextMode, nextCode));
  }

  Future<void> _connectAndCreatePrivateRoom(
    HolhuashiGameMode mode,
    String code,
  ) async {
    await _ensureWsAuthenticated();
    if (!mounted ||
        state.screenState != AppScreenState.waitingRoom ||
        !state.isPrivateRoom) {
      return;
    }
    if (_wsClient.isConnected) {
      _wsClient.createRoom(
        profileId: state.effectiveProfileId,
        displayName: state.displayName,
        username: state.username,
        avatarId: state.avatarId,
        mode: _serverModeWireKey(mode),
        variant: _currentVariantWireKey(mode),
        stakeBuyIn: state.stakeBuyIn,
        targetScore: state.targetScore,
        turnTimerSeconds: state.turnTimerSeconds,
        fillEmptySeatsWithBots: state.fillEmptySeatsWithBots,
        isPrivate: true,
        preferredRoomCode: code,
      );
    }
  }

  /// Joins an existing Private Room by 4- or 6-character code.
  Future<void> joinPrivateRoomByCode(String rawCode) async {
    final cleaned = rawCode.trim().toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    if (cleaned.length < 4 || cleaned.length > 6) {
      state = state.copyWith(
        matchmakingNotification: 'Enter a valid 6-character room code.',
      );
      return;
    }
    _sensory.lightImpact();
    _cancelReadyGateTimers();

    final seats = GameSessionState.defaultSeatsForPlayer(
      state.displayName,
      state.eloForMode(state.selectedMode),
      profileId: state.effectiveProfileId,
      username: state.username,
      avatarId: state.avatarId,
      southReady: true,
      fillBots: false,
    );

    state = state.copyWith(
      roomCode: cleaned,
      isPrivateRoom: true,
      fillEmptySeatsWithBots: false,
      isReadyCheckActive: false,
      seats: seats,
      clearMatchmakingNotification: true,
      screenState: AppScreenState.waitingRoom,
    );

    await _ensureWsAuthenticated();
    if (!mounted || state.screenState != AppScreenState.waitingRoom) return;
    if (_wsClient.isConnected) {
      _wsClient.joinRoom(
        roomCode: cleaned,
        profileId: state.effectiveProfileId,
        displayName: state.displayName,
        username: state.username,
        avatarId: state.avatarId,
      );
    }
  }

  /// Starts Stage-2 Ready Check countdown for the current waiting table.
  void beginStage2ReadyCheck({int? seconds}) {
    _cancelReadyGateTimers();
    final startSeconds = seconds ?? _initialReadyCheckSeconds;
    state = state.copyWith(
      isReadyCheckActive: true,
      readyCheckSecondsRemaining: startSeconds,
    );

    final tickInterval = _readyCheckDuration.inSeconds >= 1
        ? const Duration(seconds: 1)
        : _readyCheckDuration;

    _readyCheckTimer = Timer.periodic(tickInterval, (_) {
      if (!mounted) {
        _cancelReadyGateTimers();
        return;
      }
      if (!state.isReadyCheckActive ||
          state.screenState != AppScreenState.waitingRoom) {
        _cancelReadyGateTimers();
        return;
      }

      final nextSeconds = state.readyCheckSecondsRemaining - 1;
      if (nextSeconds <= 0) {
        _cancelReadyGateTimers();
        if (!state.southSeat.isReady) {
          state = state.copyWith(
            readyCheckSecondsRemaining: 0,
            isReadyCheckActive: false,
            matchmakingNotification:
                'Ready check expired. Returned to lobby.',
            screenState: AppScreenState.lobby,
          );
        } else {
          state = state.copyWith(
            readyCheckSecondsRemaining: _initialReadyCheckSeconds,
            isReadyCheckActive: false,
            matchmakingNotification:
                'Opponent did not accept. Returned to queue.',
          );
        }
      } else {
        state = state.copyWith(readyCheckSecondsRemaining: nextSeconds);
      }
    });
  }

  /// Accepts Stage-2 Match Ready Check.
  Future<void> acceptReadyCheck() async {
    _sensory.selectionClick();
    if (state.screenState != AppScreenState.waitingRoom) return;
    final current = state.seats[CompassSeat.south];
    if (current == null) return;

    final updated = Map<CompassSeat, SeatOccupant>.from(state.seats);
    updated[CompassSeat.south] = current.copyWith(isReady: true);
    state = state.copyWith(seats: updated);

    if (_wsClient.isConnected) {
      _wsClient.toggleReady(
        roomCode: state.roomCode,
        isReady: true,
        accept: true,
        profileId: state.effectiveProfileId,
      );
    }

    if (state.isReadyCheckActive &&
        state.isTableFullOfHumans &&
        state.allFilledSeatsReady) {
      _cancelReadyGateTimers();
      _sensory.mediumImpact();
      state = state.copyWith(
        isReadyCheckActive: false,
        screenState: AppScreenState.inGame,
      );
    }
  }

  /// Declines Stage-2 Match Ready Check and returns cleanly to Lobby.
  void declineReadyCheck() {
    _sensory.selectionClick();
    _cancelReadyGateTimers();
    if (_wsClient.isConnected) {
      _wsClient.toggleReady(
        roomCode: state.roomCode,
        isReady: false,
        accept: false,
        profileId: state.effectiveProfileId,
      );
      _wsClient.updatePresence(status: 'IN_LOBBY');
    }
    state = state.copyWith(
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      screenState: AppScreenState.lobby,
    );
  }

  Future<void> confirmHumanReady() => acceptReadyCheck();

  void enterMatchmaking(
    HolhuashiGameMode mode, {
    bool isPrivateRoom = false,
  }) {
    if (isPrivateRoom) {
      createPrivateRoom(mode);
    } else {
      enterOnlineQueue(mode);
    }
  }

  void leaveWaitingRoom() {
    _sensory.selectionClick();
    _cancelReadyGateTimers();
    if (_wsClient.isConnected) {
      if (state.isPrivateRoom) {
        _wsClient.leaveRoom(roomCode: state.roomCode);
      } else {
        _wsClient.matchmakeCancel(
          roomCode: state.roomCode,
          profileId: state.effectiveProfileId,
        );
      }
      _wsClient.updatePresence(status: 'IN_LOBBY');
    }
    state = state.copyWith(
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      screenState: AppScreenState.lobby,
    );
  }

  void dismissMatchmakingNotification() {
    state = state.copyWith(clearMatchmakingNotification: true);
  }

  void goToWaitingRoom({
    HolhuashiGameMode? mode,
    String? roomCode,
    bool isPrivate = true,
  }) {
    final nextMode = mode ?? state.selectedMode;
    if (isPrivate) {
      if (roomCode != null && roomCode.trim().isNotEmpty) {
        state = state.copyWith(selectedMode: nextMode);
        unawaited(joinPrivateRoomByCode(roomCode));
      } else {
        createPrivateRoom(nextMode);
      }
    } else {
      enterOnlineQueue(nextMode);
    }
  }

  void openWaitingRoom({HolhuashiGameMode? mode, String? roomCode}) {
    goToWaitingRoom(mode: mode, roomCode: roomCode, isPrivate: true);
  }

  void startOnlineMatchmaking([HolhuashiGameMode? mode]) {
    enterOnlineQueue(mode ?? state.selectedMode);
  }

  void startSoloMatch([HolhuashiGameMode? mode]) {
    startOfflineAiMatch(mode ?? state.selectedMode);
  }

  void startMatch() {
    if (!state.canStartPrivateMatch) {
      return;
    }
    _cancelReadyGateTimers();
    _sensory.mediumImpact();
    if (_wsClient.isConnected) {
      _wsClient.startMatch(
        roomCode: state.roomCode,
        fillEmptySeatsWithBots: state.fillEmptySeatsWithBots,
      );
    }
    state = state.copyWith(
      isReadyCheckActive: false,
      screenState: AppScreenState.inGame,
    );
  }

  void enterGame([HolhuashiGameMode? mode]) {
    startOfflineAiMatch(mode);
  }

  // ---------------------------------------------------------------------------
  // Waiting Room Controls (Room Code, Seats, Target Score, Turn Timer)
  // ---------------------------------------------------------------------------

  String regenerateRoomCode() {
    _sensory.selectionClick();
    final newCode = generateRoomCode();
    state = state.copyWith(roomCode: newCode);
    if (state.isPrivateRoom && _wsClient.isConnected) {
      unawaited(_connectAndCreatePrivateRoom(state.selectedMode, newCode));
    }
    return newCode;
  }

  void setRoomCode(String code) {
    final cleaned = code.trim().toUpperCase();
    if (cleaned.isEmpty) return;
    state = state.copyWith(roomCode: cleaned);
  }

  void setTargetScore(int score) {
    if (score != 500 && score != 1000) return;
    _sensory.selectionClick();
    state = state.copyWith(targetScore: score);
    if (state.isPrivateRoom && _wsClient.isConnected) {
      _wsClient.toggleReady(
        roomCode: state.roomCode,
        isReady: state.southSeat.isReady,
        targetScore: score,
      );
    }
  }

  void toggleTargetScore() {
    setTargetScore(state.targetScore == 500 ? 1000 : 500);
  }

  void setDiguFormat(DiguTableFormat format) {
    _sensory.selectionClick();
    state = state.copyWith(
      diguFormat: format,
      targetScore: format.defaultTargetScore,
    );
  }

  void setBondiVariant(BondiVariant variant) {
    _sensory.selectionClick();
    state = state.copyWith(bondiVariant: variant);
  }

  void setDhihaehVariant(DhihaehVariant variant) {
    _sensory.selectionClick();
    state = state.copyWith(dhihaehVariant: variant);
  }

  void setTurnTimer(int seconds) {
    if (seconds != 15 && seconds != 30) return;
    _sensory.selectionClick();
    state = state.copyWith(turnTimerSeconds: seconds);
    if (state.isPrivateRoom && _wsClient.isConnected) {
      _wsClient.toggleReady(
        roomCode: state.roomCode,
        isReady: state.southSeat.isReady,
        turnTimerSeconds: seconds,
      );
    }
  }

  void toggleTurnTimer() {
    setTurnTimer(state.turnTimerSeconds == 15 ? 30 : 15);
  }

  /// Only applicable in Private Rooms: toggles AI bots in currently empty seats.
  void setFillEmptySeatsWithBots(bool enabled) {
    if (!state.isPrivateRoom) return;
    _sensory.selectionClick();
    const botNames = <CompassSeat, String>{
      CompassSeat.north: 'Aishath',
      CompassSeat.east: 'Hussain',
      CompassSeat.west: 'Ibrahim',
    };
    const botAvatars = <CompassSeat, String>{
      CompassSeat.north: 'partner_island',
      CompassSeat.east: 'east_island',
      CompassSeat.west: 'west_island',
    };

    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    for (final compass in state.activeCompassOrder) {
      if (compass == CompassSeat.south) continue;
      final current = updatedSeats[compass];
      if (current != null && current.isHuman) continue;
      if (enabled) {
        updatedSeats[compass] = SeatOccupant(
          seat: compass,
          displayName: botNames[compass] ?? 'Bot',
          subtitle: '${compass.label} • AI',
          isHuman: false,
          isBot: true,
          isReady: true,
          elo: 1280,
          avatarId: botAvatars[compass] ?? 'bot_island',
        );
      } else {
        updatedSeats[compass] = SeatOccupant.open(compass);
      }
    }

    state = state.copyWith(
      fillEmptySeatsWithBots: enabled,
      seats: updatedSeats,
    );

    if (_wsClient.isConnected) {
      _wsClient.toggleReady(
        roomCode: state.roomCode,
        isReady: state.southSeat.isReady,
        fillEmptySeatsWithBots: enabled,
      );
    }
  }

  void toggleReady([CompassSeat seat = CompassSeat.south]) {
    _sensory.selectionClick();
    final current = state.seats[seat];
    if (current == null) return;
    final nextReady = !current.isReady;
    final updated = Map<CompassSeat, SeatOccupant>.from(state.seats);
    updated[seat] = current.copyWith(isReady: nextReady);
    state = state.copyWith(seats: updated);
    if (_wsClient.isConnected) {
      _wsClient.toggleReady(roomCode: state.roomCode, isReady: nextReady);
    }
  }

  void claimSeat(CompassSeat targetSeat) {
    _sensory.lightImpact();
    final updated = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final currentOccupant = updated[targetSeat];
    final currentSouth = updated[CompassSeat.south];
    if (currentOccupant == null || currentSouth == null) return;

    if (targetSeat != CompassSeat.south) {
      updated[targetSeat] = currentSouth.copyWith(seat: targetSeat);
      updated[CompassSeat.south] = currentOccupant.copyWith(
        seat: CompassSeat.south,
      );
      state = state.copyWith(seats: updated);
      if (_wsClient.isConnected) {
        _wsClient.assignSeat(
          roomCode: state.roomCode,
          seatIndex: targetSeat.index,
          profileId: state.effectiveProfileId,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Settings Updates (Persisted to SharedPreferences + SensoryService)
  // ---------------------------------------------------------------------------

  Future<void> _updateSettings(UserSettings newSettings) async {
    _sensory.applySettings(newSettings);
    state = state.copyWith(settings: newSettings);
    try {
      await _persistence.saveSettings(newSettings);
    } catch (_) {}
  }

  Future<void> setSfxVolume(double volume) async {
    await _updateSettings(
      state.settings.copyWith(sfxVolume: volume.clamp(0.0, 1.0)),
    );
  }

  Future<void> setBgmVolume(double volume) async {
    await _updateSettings(
      state.settings.copyWith(bgmVolume: volume.clamp(0.0, 1.0)),
    );
  }

  Future<void> setHapticsEnabled(bool enabled) async {
    await _updateSettings(state.settings.copyWith(hapticsEnabled: enabled));
    if (enabled) {
      await _sensory.selectionClick();
    }
  }

  Future<void> toggleHaptics() => setHapticsEnabled(!state.hapticsEnabled);

  Future<void> setScreenShakeEnabled(bool enabled) async {
    _sensory.selectionClick();
    await _updateSettings(state.settings.copyWith(screenShakeEnabled: enabled));
  }

  Future<void> toggleScreenShake() =>
      setScreenShakeEnabled(!state.screenShakeEnabled);

  Future<void> setFastDealSpeed(bool fast) async {
    _sensory.selectionClick();
    await _updateSettings(state.settings.copyWith(fastDealSpeed: fast));
  }

  Future<void> toggleFastDealSpeed() => setFastDealSpeed(!state.fastDealSpeed);

  Future<void> setGoogleLinked(bool linked) async {
    _sensory.lightImpact();
    await _updateSettings(state.settings.copyWith(googleLinked: linked));
  }

  Future<void> toggleGoogleLinked() => setGoogleLinked(!state.googleLinked);

  Future<void> updateDisplayName(String name) async {
    final trimmed = name.trim().isEmpty ? 'Raaveriyaa' : name.trim();
    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final south = updatedSeats[CompassSeat.south];
    if (south != null) {
      updatedSeats[CompassSeat.south] = south.copyWith(displayName: trimmed);
    }
    state = state.copyWith(displayName: trimmed, seats: updatedSeats);
    try {
      await _persistence.setDisplayName(trimmed);
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Quick-Chat Radial Emotes & Ephemeral Bubble State
  // ---------------------------------------------------------------------------

  void sendQuickChat(
    QuickChatPreset preset, {
    CompassSeat seat = CompassSeat.south,
    String? senderName,
  }) {
    _sensory.lightImpact();
    final sender = senderName ?? state.seats[seat]?.displayName ?? state.displayName;
    final message = QuickChatMessage(
      id: '${preset.id}_${DateTime.now().millisecondsSinceEpoch}',
      senderName: sender,
      seat: seat,
      thaana: preset.thaana,
      latin: preset.latin,
      timestamp: DateTime.now(),
    );

    _wsClient.sendQuickChatEmote(
      roomCode: state.roomCode,
      emoteId: preset.id,
      text: preset.latin,
      thaanaText: preset.thaana,
      senderName: sender,
    );

    state = state.copyWith(
      activeQuickChat: message,
      quickChatHistory: [message, ...state.quickChatHistory].take(20).toList(),
    );

    _quickChatDismissTimer?.cancel();
    _quickChatDismissTimer = Timer(const Duration(milliseconds: 3200), () {
      if (mounted) {
        dismissQuickChat();
      }
    });
  }

  void sendQuickChatById(String presetId) {
    final preset = kHolhuashiQuickChatPresets.firstWhere(
      (p) => p.id == presetId,
      orElse: () => kHolhuashiQuickChatPresets.first,
    );
    sendQuickChat(preset);
  }

  void dismissQuickChat() {
    _quickChatDismissTimer?.cancel();
    state = state.copyWith(clearActiveQuickChat: true);
  }

  // ---------------------------------------------------------------------------
  // Match Result & ELO Recording
  // ---------------------------------------------------------------------------

  Future<void> recordMatchResult({
    required HolhuashiGameMode mode,
    required bool humanWon,
    required int humanScore,
    required int opponentScore,
  }) async {
    final eloDelta = humanWon ? 16 : -12;
    final coinReward = humanWon ? 150 : 25;
    final modeKey = mode.name.toLowerCase();

    final updatedEloMap = Map<String, int>.from(state.eloByMode);
    final currentElo = updatedEloMap[modeKey] ?? 1250;
    updatedEloMap[modeKey] = (currentElo + eloDelta).clamp(800, 3000);
    final updatedCoins = state.coins + coinReward;

    final record = OfflineMatchRecord(
      matchId: 'match_${DateTime.now().millisecondsSinceEpoch}',
      gameMode: modeKey,
      won: humanWon,
      humanScore: humanScore,
      opponentScore: opponentScore,
      eloDelta: eloDelta,
      timestamp: DateTime.now(),
    );

    state = state.copyWith(
      eloByMode: updatedEloMap,
      coins: updatedCoins,
      matchHistory: [record, ...state.matchHistory].take(50).toList(),
    );

    try {
      await _persistence.saveEloMap(updatedEloMap);
      await _persistence.setCoins(updatedCoins);
      await _persistence.appendMatchRecord(record);
    } catch (_) {}

    if (state.authProvider == AuthProviderType.google && state.isCloudSynced) {
      unawaited(
        _cloudSyncService
            .syncProfile(_buildLocalCloudProfileSnapshot())
            .catchError((_) => false),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // @handle, Friends Management & Match Invitations
  // ---------------------------------------------------------------------------

  Future<String> updateHandle(String rawHandle) async {
    if (!state.isCloudSynced) {
      throw const CloudSyncException('Sign in with Google to set a @handle.');
    }
    final saved = await _cloudSyncService.updateHandle(
      profileId: state.effectiveProfileId,
      username: rawHandle,
    );
    if (!mounted) return saved;

    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final south = updatedSeats[CompassSeat.south];
    if (south != null) {
      updatedSeats[CompassSeat.south] = south.copyWith(username: saved);
    }

    state = state.copyWith(username: saved, seats: updatedSeats);
    try {
      await _persistence.setUsername(saved);
    } catch (_) {}

    if (_wsClient.isConnected) {
      _wsClient.authenticate(
        profileId: state.effectiveProfileId,
        displayName: state.displayName,
        username: saved,
        loginProvider: 'GOOGLE',
        avatarId: state.avatarId,
        friendCode: state.friendCode,
      );
    }
    return saved;
  }

  Future<void> refreshFriendsAndRequests() async {
    if (!state.isCloudSynced) return;
    state = state.copyWith(friendsLoading: true, clearFriendsError: true);
    try {
      final results = await Future.wait([
        _friendsService.fetchFriends(state.effectiveProfileId),
        _friendsService.fetchRequests(state.effectiveProfileId),
      ]);
      if (!mounted) return;
      final friendsList = results[0] as List<FriendEntry>;
      final bundle = results[1] as FriendRequestsBundle;
      state = state.copyWith(
        friends: friendsList,
        incomingFriendRequests: bundle.incoming,
        outgoingFriendRequests: bundle.outgoing,
        friendsLoading: false,
        clearFriendsError: true,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        friendsLoading: false,
        friendsError: e.toString(),
      );
    }
  }

  Future<PlayerLookupResult?> lookupFriendCandidate(String query) {
    return _friendsService.lookupPlayer(
      query: query,
      requesterId: state.effectiveProfileId,
    );
  }

  Future<void> sendFriendRequest(String identifier) async {
    await _friendsService.sendRequest(
      profileId: state.effectiveProfileId,
      identifier: identifier,
    );
    await refreshFriendsAndRequests();
  }

  Future<void> respondToFriendRequest({
    required String requestId,
    required bool accept,
  }) async {
    await _friendsService.respondToRequest(
      requestId: requestId,
      accept: accept,
      profileId: state.effectiveProfileId,
    );
    await refreshFriendsAndRequests();
  }

  Future<void> cancelFriendRequest(String requestId) async {
    await _friendsService.cancelOutgoingRequest(
      requestId: requestId,
      profileId: state.effectiveProfileId,
    );
    await refreshFriendsAndRequests();
  }

  Future<void> removeFriend(String friendId) async {
    await _friendsService.removeFriend(
      profileId: state.effectiveProfileId,
      friendId: friendId,
    );
    await refreshFriendsAndRequests();
  }

  Future<void> inviteFriendToRoom(String friendId) async {
    await _ensureWsAuthenticated();
    if (!_wsClient.isConnected) return;
    _wsClient.sendMatchInvite(
      friendId: friendId,
      roomCode: state.roomCode,
      mode: _serverModeWireKey(state.selectedMode),
      format: _currentVariantWireKey(state.selectedMode),
      stakeBuyIn: state.stakeBuyIn,
      targetScore: state.targetScore,
    );
  }

  Future<void> respondToMatchInvite(bool accept) async {
    final invite = state.pendingMatchInvite;
    if (invite == null) return;
    _inviteExpiryTimer?.cancel();
    state = state.copyWith(clearPendingMatchInvite: true);

    if (accept) {
      await _ensureWsAuthenticated();
    }
    if (_wsClient.isConnected) {
      _wsClient.respondMatchInvite(inviteId: invite.id, accept: accept);
    }

    if (accept) {
      final mode = _parseGameMode(invite.mode);
      var nextFormat = state.diguFormat;
      if (mode == HolhuashiGameMode.digu) {
        final fmt = (invite.format ?? '').toLowerCase();
        if (fmt == '1v1') {
          nextFormat = DiguTableFormat.duel1v1;
        } else if (fmt == '4p_solo') {
          nextFormat = DiguTableFormat.freeForAll4p;
        } else {
          nextFormat = DiguTableFormat.partners2v2;
        }
      }
      state = state.copyWith(
        selectedMode: mode,
        diguFormat: nextFormat,
        stakeBuyIn: invite.stakeBuyIn,
      );
      await joinPrivateRoomByCode(invite.roomCode);
    }
  }

  void dismissMatchInvite() {
    _inviteExpiryTimer?.cancel();
    state = state.copyWith(clearPendingMatchInvite: true);
  }

  // ---------------------------------------------------------------------------
  // Authoritative WebSocket Event Handling
  // ---------------------------------------------------------------------------

  void _handleWsMessage(Map<String, dynamic> message) {
    if (!mounted) return;
    final type = message['type'] as String? ?? '';
    final payload = message['payload'] is Map
        ? Map<String, dynamic>.from(message['payload'] as Map)
        : <String, dynamic>{};

    switch (type) {
      case 'AUTH_SUCCESS':
        final serverFriendCode = payload['friendCode'] as String?;
        final serverUsername = payload['username'] as String?;
        state = state.copyWith(
          friendCode: serverFriendCode ?? state.friendCode,
          username: serverUsername ?? state.username,
        );
        if (state.isCloudSynced) {
          unawaited(refreshFriendsAndRequests());
        }
        break;

      case 'MATCHMAKE_JOINED':
      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
      case 'ROOM_LEFT':
      case 'READY_UPDATED':
      case 'SESSION_RESTORED':
      case 'PLAYER_DISCONNECTED':
        final roomRaw = payload['room'];
        if (roomRaw is Map) {
          _applyServerRoomSnapshot(Map<String, dynamic>.from(roomRaw));
        }
        break;

      case 'READY_CHECK_STARTED':
        final roomRaw = payload['room'];
        if (roomRaw is Map) {
          _applyServerRoomSnapshot(Map<String, dynamic>.from(roomRaw));
        }
        final expiresAtMs = (payload['expiresAt'] as num?)?.toInt();
        var seconds = _initialReadyCheckSeconds;
        if (expiresAtMs != null) {
          final delta = ((expiresAtMs - DateTime.now().millisecondsSinceEpoch) / 1000).ceil();
          seconds = delta.clamp(1, 30);
        }
        _sensory.mediumImpact();
        beginStage2ReadyCheck(seconds: seconds);
        break;

      case 'READY_CHECK_TIMEOUT':
        _cancelReadyGateTimers();
        final roomRaw = payload['room'];
        if (roomRaw is Map) {
          _applyServerRoomSnapshot(Map<String, dynamic>.from(roomRaw));
        }
        state = state.copyWith(
          isReadyCheckActive: false,
          readyCheckSecondsRemaining: _initialReadyCheckSeconds,
          matchmakingNotification: payload['message'] as String?,
        );
        break;

      case 'READY_CHECK_FAILED':
        _cancelReadyGateTimers();
        state = state.copyWith(
          isReadyCheckActive: false,
          readyCheckSecondsRemaining: _initialReadyCheckSeconds,
          matchmakingNotification:
              payload['reason'] as String? ?? 'Ready check cancelled.',
          screenState: AppScreenState.lobby,
        );
        break;

      case 'MATCH_STARTED':
        _cancelReadyGateTimers();
        final roomRaw = payload['room'];
        if (roomRaw is Map) {
          _applyServerRoomSnapshot(Map<String, dynamic>.from(roomRaw));
        }
        _sensory.mediumImpact();
        state = state.copyWith(
          isReadyCheckActive: false,
          screenState: AppScreenState.inGame,
        );
        break;

      case 'ROOM_ERROR':
        state = state.copyWith(
          matchmakingNotification:
              payload['error'] as String? ?? 'Room action failed.',
        );
        break;

      case 'FRIEND_PRESENCE_UPDATE':
        final fid = payload['friendId'] as String?;
        final nextStatus = payload['status'] as String?;
        if (fid != null && nextStatus != null) {
          final updated = state.friends
              .map(
                (f) => f.friendId == fid
                    ? f.copyWith(
                        presenceStatus: nextStatus,
                        currentMatchInfo: payload['matchInfo'] is Map
                            ? Map<String, dynamic>.from(
                                payload['matchInfo'] as Map,
                              )
                            : f.currentMatchInfo,
                      )
                    : f,
              )
              .toList();
          state = state.copyWith(friends: updated);
        }
        break;

      case 'FRIEND_REQUEST_RECEIVED':
      case 'FRIEND_REQUEST_RESOLVED':
      case 'FRIEND_REMOVED':
        unawaited(refreshFriendsAndRequests());
        break;

      case 'MATCH_INVITE_RECEIVED':
        final invite = MatchInviteEntry.fromJson(payload);
        _inviteExpiryTimer?.cancel();
        _sensory.mediumImpact();
        state = state.copyWith(pendingMatchInvite: invite);
        _inviteExpiryTimer = Timer(const Duration(seconds: 20), () {
          if (mounted && state.pendingMatchInvite?.id == invite.id) {
            state = state.copyWith(clearPendingMatchInvite: true);
          }
        });
        break;

      case 'QUICK_CHAT_EMOTE':
        final senderId = payload['senderId'] as String?;
        if (senderId == state.effectiveProfileId) return;
        final seatIdx = (payload['seatIndex'] as num?)?.toInt() ?? 0;
        final seat = CompassSeat.values[seatIdx.clamp(0, 3)];
        final msg = QuickChatMessage(
          id: 'ws_qc_${DateTime.now().millisecondsSinceEpoch}',
          senderName: payload['senderName'] as String? ?? 'Player',
          seat: seat,
          thaana: payload['thaanaText'] as String? ?? 'މަރުޙަބާ!',
          latin: payload['text'] as String? ?? 'Maruhabaa!',
          timestamp: DateTime.now(),
        );
        state = state.copyWith(
          activeQuickChat: msg,
          quickChatHistory: [msg, ...state.quickChatHistory].take(20).toList(),
        );
        break;

      default:
        break;
    }
  }

  void _applyServerRoomSnapshot(Map<String, dynamic> room) {
    final code = (room['roomCode'] ?? room['room_code'])?.toString();
    final isPrivate =
        room['isPrivate'] as bool? ?? room['is_private'] as bool? ?? state.isPrivateRoom;
    final fillBots = isPrivate &&
        (room['fillEmptySeatsWithBots'] as bool? ??
            room['fill_empty_seats_with_bots'] as bool? ??
            false);
    final rawSeats = room['seats'] as List<dynamic>? ?? const [];

    // Locate viewer's seat so local player always anchors to CompassSeat.south
    int viewerIndex = 0;
    for (var i = 0; i < rawSeats.length; i++) {
      final s = rawSeats[i];
      if (s is Map) {
        final pid = (s['profileId'] ?? s['profile_id'])?.toString();
        if (pid == state.effectiveProfileId) {
          viewerIndex = (s['seatIndex'] as num?)?.toInt() ?? i;
          break;
        }
      }
    }

    final mappedSeats = <CompassSeat, SeatOccupant>{};
    final compassOrder = state.activeCompassOrder;
    for (var i = 0; i < compassOrder.length; i++) {
      final compass = compassOrder[i];
      if (rawSeats.isEmpty) {
        mappedSeats[compass] = SeatOccupant.open(compass);
        continue;
      }
      final serverIdx = (viewerIndex + i) % rawSeats.length;
      final raw = rawSeats[serverIdx];
      if (raw is! Map) {
        mappedSeats[compass] = SeatOccupant.open(compass);
        continue;
      }
      final pid = (raw['profileId'] ?? raw['profile_id'])?.toString();
      final isBot = raw['isBot'] as bool? ?? raw['is_bot'] as bool? ?? false;
      final isReady =
          raw['isReady'] as bool? ?? raw['is_ready'] as bool? ?? false;
      final name =
          (raw['playerName'] ?? raw['player_name'] ?? 'Open Seat').toString();
      final uname = raw['username']?.toString();
      final avatar = (raw['avatarId'] ?? raw['avatar_id'] ?? 'sultan').toString();

      if (pid == null || pid.isEmpty) {
        mappedSeats[compass] = SeatOccupant.open(compass);
      } else if (isBot) {
        mappedSeats[compass] = SeatOccupant(
          seat: compass,
          profileId: pid,
          displayName: name,
          subtitle: '${compass.label} • AI',
          isHuman: false,
          isBot: true,
          isReady: isReady,
          elo: 1280,
          avatarId: avatar,
        );
      } else {
        final isSelf = pid == state.effectiveProfileId;
        mappedSeats[compass] = SeatOccupant(
          seat: compass,
          profileId: pid,
          displayName: name,
          username: uname,
          subtitle: isSelf ? 'YOU' : compass.label,
          isHuman: true,
          isBot: false,
          isReady: isReady,
          elo: state.eloForMode(state.selectedMode),
          avatarId: avatar,
        );
      }
    }

    for (final seat in CompassSeat.values) {
      mappedSeats.putIfAbsent(seat, () => SeatOccupant.open(seat));
    }

    final spectators = (room['spectators'] as List<dynamic>? ?? const []).length;
    state = state.copyWith(
      roomCode: code ?? state.roomCode,
      isPrivateRoom: isPrivate,
      fillEmptySeatsWithBots: fillBots,
      spectatorCount: spectators,
      seats: mappedSeats,
      targetScore:
          (room['targetScore'] as num?)?.toInt() ?? state.targetScore,
      turnTimerSeconds:
          (room['turnTimerSeconds'] as num?)?.toInt() ?? state.turnTimerSeconds,
    );
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    _wsClient.connectionStateNotifier.removeListener(_onWsConnectionChanged);
    if (_ownsWsClient) {
      unawaited(_wsClient.dispose());
    }
    _quickChatDismissTimer?.cancel();
    _inviteExpiryTimer?.cancel();
    _cancelReadyGateTimers();
    super.dispose();
  }
}

/// Global Riverpod provider for [GameSessionNotifier] and [GameSessionState].
final gameSessionProvider =
    StateNotifierProvider<GameSessionNotifier, GameSessionState>((ref) {
  final persistence = ref.watch(localPersistenceProvider);
  final sensory = ref.watch(sensoryServiceProvider);
  return GameSessionNotifier(
    persistence: persistence,
    sensory: sensory,
  );
});
