import 'dart:async';
import 'dart:math' as math;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/audio/sensory_service.dart';
import '../core/bondi/bondi_engine.dart' show BondiVariant;
import '../core/dhihaeh/dhihaeh_engine.dart' show DhihaehVariant;
import '../core/digu/digu_resolver.dart' show DiguTableFormat;
import '../core/services/cloud_sync_service.dart';
import '../core/services/google_auth_service.dart';
import '../data/local_persistence.dart';
import '../game/table_canvas.dart' show HolhuashiGameMode;
import '../network/ws_client.dart';

export '../core/bondi/bondi_engine.dart' show BondiVariant;
export '../core/dhihaeh/dhihaeh_engine.dart' show DhihaehVariant;
export '../core/digu/digu_resolver.dart' show DiguTableFormat;
export '../core/services/cloud_sync_service.dart'
    show CloudPlayerProfile, CloudProfileConflict, GoogleAuthSyncResult;
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
  final String displayName;
  final String subtitle;
  final bool isHuman;
  final bool isBot;
  final bool isReady;
  final int elo;
  final String avatarId;

  const SeatOccupant({
    required this.seat,
    required this.displayName,
    required this.subtitle,
    this.isHuman = false,
    this.isBot = true,
    this.isReady = true,
    this.elo = 1250,
    this.avatarId = 'bot_island',
  });

  SeatOccupant copyWith({
    CompassSeat? seat,
    String? displayName,
    String? subtitle,
    bool? isHuman,
    bool? isBot,
    bool? isReady,
    int? elo,
    String? avatarId,
  }) {
    return SeatOccupant(
      seat: seat ?? this.seat,
      displayName: displayName ?? this.displayName,
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
  final String displayName;
  final String avatarId;
  final int coins;
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

  const GameSessionState({
    this.screenState = AppScreenState.auth,
    this.selectedMode = HolhuashiGameMode.digu,
    this.guestUuid = 'guest-local-0001',
    this.displayName = 'Raaveriyaa',
    this.avatarId = 'maldivian_captain',
    this.coins = 2450,
    this.eloByMode = LocalPersistenceRepository.defaultEloMap,
    this.roomCode = 'MLD842',
    this.isPrivateRoom = true,
    this.targetScore = 500,
    this.turnTimerSeconds = 15,
    this.fillEmptySeatsWithBots = true,
    this.spectatorCount = 2,
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
  });

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
      seats: defaultSeatsForPlayer('Raaveriyaa', 1284),
    );
  }

  static Map<CompassSeat, SeatOccupant> defaultSeatsForPlayer(
    String playerName,
    int playerElo, {
    bool southReady = false,
    bool botsReady = true,
  }) {
    return {
      CompassSeat.south: SeatOccupant(
        seat: CompassSeat.south,
        displayName: playerName,
        subtitle: 'YOU • HOST',
        isHuman: true,
        isBot: false,
        isReady: southReady,
        elo: playerElo,
        avatarId: 'maldivian_captain',
      ),
      CompassSeat.north: SeatOccupant(
        seat: CompassSeat.north,
        displayName: 'Aishath',
        subtitle: 'PARTNER • AI',
        isHuman: false,
        isBot: true,
        isReady: botsReady,
        elo: 1310,
        avatarId: 'partner_island',
      ),
      CompassSeat.east: SeatOccupant(
        seat: CompassSeat.east,
        displayName: 'Hussain',
        subtitle: 'EAST • AI',
        isHuman: false,
        isBot: true,
        isReady: botsReady,
        elo: 1290,
        avatarId: 'east_island',
      ),
      CompassSeat.west: SeatOccupant(
        seat: CompassSeat.west,
        displayName: 'Ibrahim',
        subtitle: 'WEST • AI',
        isHuman: false,
        isBot: true,
        isReady: botsReady,
        elo: 1265,
        avatarId: 'west_island',
      ),
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
          : 'GUEST (TAP TO LINK)';

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
    for (final occupant in seats.values) {
      if (!occupant.isHuman && !fillEmptySeatsWithBots) {
        continue;
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
    String? displayName,
    String? avatarId,
    int? coins,
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
  }) {
    return GameSessionState(
      screenState: screenState ?? this.screenState,
      selectedMode: selectedMode ?? this.selectedMode,
      guestUuid: guestUuid ?? this.guestUuid,
      displayName: displayName ?? this.displayName,
      avatarId: avatarId ?? this.avatarId,
      coins: coins ?? this.coins,
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
  final GoogleAuthService _googleAuthService;
  final CloudSyncService _cloudSyncService;
  final Duration _readyCheckDuration;
  Timer? _quickChatDismissTimer;
  Timer? _readyCheckTimer;
  final List<Timer> _botStaggerTimers = [];

  GameSessionNotifier({
    LocalPersistenceRepository? persistence,
    SensoryService? sensory,
    HolhuashiWsClient? wsClient,
    GoogleAuthService? googleAuthService,
    CloudSyncService? cloudSyncService,
    Duration readyCheckDuration = const Duration(seconds: 15),
    GameSessionState? initialState,
  })  : _persistence = persistence ?? LocalPersistenceRepository(),
        _sensory = sensory ?? SensoryService.instance,
        _wsClient = wsClient ?? HolhuashiWsClient(autoReconnect: false),
        _googleAuthService = googleAuthService ?? GoogleAuthService(),
        _cloudSyncService = cloudSyncService ?? CloudSyncService(),
        _readyCheckDuration = readyCheckDuration,
        super(initialState ?? GameSessionState.initial()) {
    _hydrateFromStorage();
  }

  HolhuashiWsClient get wsClient => _wsClient;
  LocalPersistenceRepository get persistence => _persistence;
  SensoryService get sensory => _sensory;
  GoogleAuthService get googleAuthService => _googleAuthService;
  CloudSyncService get cloudSyncService => _cloudSyncService;

  Future<void> _hydrateFromStorage() async {
    try {
      final profile = await _persistence.ensureGuestProfileInitialized();
      final settings = await _persistence.loadSettings();
      final history = await _persistence.loadMatchHistory();
      _sensory.applySettings(settings);

      if (!mounted) return;
      final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
      final currentSouth = updatedSeats[CompassSeat.south];
      if (currentSouth != null) {
        updatedSeats[CompassSeat.south] = currentSouth.copyWith(
          displayName: profile.displayName,
          elo: profile.eloByMode[state.selectedMode.name] ?? 1284,
        );
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

      state = state.copyWith(
        guestUuid: profile.uuid,
        displayName: profile.displayName,
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
      id: state.guestUuid,
      displayName: state.displayName,
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
    final resolvedEmail =
        (profile.email != null && profile.email!.trim().isNotEmpty)
            ? profile.email!.trim()
            : fallbackEmail;

    final updatedSeats = Map<CompassSeat, SeatOccupant>.from(state.seats);
    final south = updatedSeats[CompassSeat.south];
    if (south != null) {
      updatedSeats[CompassSeat.south] = south.copyWith(
        displayName: resolvedName,
      );
    }

    state = state.copyWith(
      authProvider: AuthProviderType.google,
      cloudSyncState: CloudSyncState.synced,
      userEmail: resolvedEmail,
      displayName: resolvedName,
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
      await _persistence.setDisplayName(resolvedName);
      await _persistence.setAvatarId(profile.avatarId);
      await _persistence.setCoins(profile.coins);
      if (profile.friendCode != null) {
        await _persistence.setFriendCode(profile.friendCode);
      }
    } catch (_) {}
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
    await _googleAuthService.signOut();
    if (!mounted) return;

    state = state.copyWith(
      authProvider: AuthProviderType.none,
      cloudSyncState: CloudSyncState.offlineLocal,
      clearUserEmail: true,
      authBusy: false,
      clearAuthErrorMessage: true,
      clearPendingCloudConflict: true,
      isReadyCheckActive: false,
      screenState: AppScreenState.auth,
    );

    await _updateSettings(
      state.settings.copyWith(
        authProvider: 'none',
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

  void _tryCompleteReadyGate() {
    if (!mounted) return;
    if (!state.isReadyCheckActive ||
        state.screenState != AppScreenState.waitingRoom) {
      return;
    }
    if (!state.southSeat.isReady || !state.allFilledSeatsReady) {
      return;
    }
    _cancelReadyGateTimers();
    _sensory.mediumImpact();
    _wsClient.startMatch(roomCode: state.roomCode);
    state = state.copyWith(
      isReadyCheckActive: false,
      screenState: AppScreenState.inGame,
    );
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
    state = state.copyWith(
      isReadyCheckActive: false,
      readyCheckSecondsRemaining: _initialReadyCheckSeconds,
      screenState: AppScreenState.lobby,
    );
  }

  void returnToLobby() => goToLobby();

  void enterMatchmaking(
    HolhuashiGameMode mode, {
    bool isPrivateRoom = false,
  }) {
    _sensory.lightImpact();
    _cancelReadyGateTimers();

    final seats = GameSessionState.defaultSeatsForPlayer(
      state.displayName,
      state.eloForMode(mode),
      southReady: false,
      botsReady: !state.fillEmptySeatsWithBots,
    );
    final initialSeconds = _initialReadyCheckSeconds;

    state = state.copyWith(
      selectedMode: mode,
      lastPlayedMode: mode,
      isPrivateRoom: isPrivateRoom,
      seats: seats,
      screenState: AppScreenState.waitingRoom,
      isReadyCheckActive: true,
      readyCheckSecondsRemaining: initialSeconds,
      clearMatchmakingNotification: true,
    );

    unawaited(
      _updateSettings(
        state.settings.copyWith(lastPlayedMode: mode.name),
      ),
    );

    if (state.fillEmptySeatsWithBots) {
      final totalMs = _readyCheckDuration.inMilliseconds;
      final botOrder = [
        CompassSeat.north,
        CompassSeat.east,
        CompassSeat.west,
      ];
      for (var i = 0; i < botOrder.length; i++) {
        final seat = botOrder[i];
        final proportionalMs = ((totalMs * 0.15) * (i + 1)).round();
        final delayMs = math.max(10, math.min(350 * (i + 1), proportionalMs));
        final timer = Timer(Duration(milliseconds: delayMs), () {
          if (!mounted ||
              !state.isReadyCheckActive ||
              state.screenState != AppScreenState.waitingRoom) {
            return;
          }
          final currentBot = state.seats[seat];
          if (currentBot == null) return;
          final updated = Map<CompassSeat, SeatOccupant>.from(state.seats);
          updated[seat] = currentBot.copyWith(isReady: true);
          state = state.copyWith(seats: updated);
          _tryCompleteReadyGate();
        });
        _botStaggerTimers.add(timer);
      }
    }

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
                'Match cancelled — tap Ready within 15 seconds to enter the table.',
            screenState: AppScreenState.lobby,
          );
        } else {
          state = state.copyWith(readyCheckSecondsRemaining: 0);
        }
      } else {
        state = state.copyWith(readyCheckSecondsRemaining: nextSeconds);
      }
    });
  }

  Future<void> confirmHumanReady() async {
    _sensory.selectionClick();
    if (state.screenState != AppScreenState.waitingRoom) return;
    final current = state.seats[CompassSeat.south];
    if (current == null) return;

    if (!current.isReady) {
      final updated = Map<CompassSeat, SeatOccupant>.from(state.seats);
      updated[CompassSeat.south] = current.copyWith(isReady: true);
      state = state.copyWith(seats: updated);
      _wsClient.toggleReady(roomCode: state.roomCode, isReady: true);
    }

    _tryCompleteReadyGate();
  }

  void leaveWaitingRoom() {
    _sensory.selectionClick();
    _cancelReadyGateTimers();
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
    final nextCode = (roomCode != null && roomCode.trim().isNotEmpty)
        ? roomCode.trim().toUpperCase()
        : state.roomCode;
    if (nextCode != state.roomCode) {
      state = state.copyWith(roomCode: nextCode);
    }
    enterMatchmaking(nextMode, isPrivateRoom: isPrivate);
  }

  void openWaitingRoom({HolhuashiGameMode? mode, String? roomCode}) {
    goToWaitingRoom(mode: mode, roomCode: roomCode, isPrivate: true);
  }

  void startOnlineMatchmaking([HolhuashiGameMode? mode]) {
    goToWaitingRoom(
      mode: mode ?? state.selectedMode,
      roomCode: state.roomCode,
      isPrivate: false,
    );
  }

  void startSoloMatch([HolhuashiGameMode? mode]) {
    enterMatchmaking(mode ?? state.selectedMode, isPrivateRoom: false);
  }

  void startMatch() {
    if (!state.southSeat.isReady || !state.allFilledSeatsReady) {
      return;
    }
    _cancelReadyGateTimers();
    _sensory.mediumImpact();
    _wsClient.startMatch(roomCode: state.roomCode);
    state = state.copyWith(
      isReadyCheckActive: false,
      screenState: AppScreenState.inGame,
    );
  }

  void enterGame([HolhuashiGameMode? mode]) {
    startSoloMatch(mode);
  }

  // ---------------------------------------------------------------------------
  // Waiting Room Controls (Room Code, Seats, Target Score, Turn Timer)
  // ---------------------------------------------------------------------------

  String regenerateRoomCode() {
    _sensory.selectionClick();
    final newCode = generateRoomCode();
    state = state.copyWith(roomCode: newCode);
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
  }

  void toggleTurnTimer() {
    setTurnTimer(state.turnTimerSeconds == 15 ? 30 : 15);
  }

  void setFillEmptySeatsWithBots(bool enabled) {
    _sensory.selectionClick();
    state = state.copyWith(fillEmptySeatsWithBots: enabled);
  }

  void toggleReady([CompassSeat seat = CompassSeat.south]) {
    _sensory.selectionClick();
    final current = state.seats[seat];
    if (current == null) return;
    final nextReady = !current.isReady;
    final updated = Map<CompassSeat, SeatOccupant>.from(state.seats);
    updated[seat] = current.copyWith(isReady: nextReady);
    state = state.copyWith(seats: updated);
    _wsClient.toggleReady(roomCode: state.roomCode, isReady: nextReady);
    if (nextReady &&
        seat == CompassSeat.south &&
        state.isReadyCheckActive &&
        state.screenState == AppScreenState.waitingRoom) {
      _tryCompleteReadyGate();
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

  @override
  void dispose() {
    _quickChatDismissTimer?.cancel();
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
