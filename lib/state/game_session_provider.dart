import 'dart:async';
import 'dart:math' as math;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/audio/sensory_service.dart';
import '../data/local_persistence.dart';
import '../game/table_canvas.dart' show HolhuashiGameMode;
import '../network/ws_client.dart';

export '../game/table_canvas.dart' show HolhuashiGameMode;

/// Top-level navigation state for the Holhuashi application shell.
enum AppScreenState {
  lobby,
  waitingRoom,
  inGame,
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
    thaana: 'ދިގު ހަމަ!',
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

  const GameSessionState({
    this.screenState = AppScreenState.lobby,
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
            : AppScreenState.lobby);

    return GameSessionState(
      screenState: screen,
      roomCode: room,
      seats: defaultSeatsForPlayer('Raaveriyaa', 1284),
    );
  }

  static Map<CompassSeat, SeatOccupant> defaultSeatsForPlayer(
    String playerName,
    int playerElo,
  ) {
    return {
      CompassSeat.south: SeatOccupant(
        seat: CompassSeat.south,
        displayName: playerName,
        subtitle: 'YOU • HOST',
        isHuman: true,
        isBot: false,
        isReady: true,
        elo: playerElo,
        avatarId: 'maldivian_captain',
      ),
      CompassSeat.north: const SeatOccupant(
        seat: CompassSeat.north,
        displayName: 'Aishath',
        subtitle: 'PARTNER • AI',
        isHuman: false,
        isBot: true,
        isReady: true,
        elo: 1310,
        avatarId: 'partner_island',
      ),
      CompassSeat.east: const SeatOccupant(
        seat: CompassSeat.east,
        displayName: 'Hussain',
        subtitle: 'EAST • AI',
        isHuman: false,
        isBot: true,
        isReady: true,
        elo: 1290,
        avatarId: 'east_island',
      ),
      CompassSeat.west: const SeatOccupant(
        seat: CompassSeat.west,
        displayName: 'Ibrahim',
        subtitle: 'WEST • AI',
        isHuman: false,
        isBot: true,
        isReady: true,
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
  Timer? _quickChatDismissTimer;

  GameSessionNotifier({
    LocalPersistenceRepository? persistence,
    SensoryService? sensory,
    HolhuashiWsClient? wsClient,
    GameSessionState? initialState,
  })  : _persistence = persistence ?? LocalPersistenceRepository(),
        _sensory = sensory ?? SensoryService.instance,
        _wsClient = wsClient ?? HolhuashiWsClient(autoReconnect: false),
        super(initialState ?? GameSessionState.initial()) {
    _hydrateFromStorage();
  }

  HolhuashiWsClient get wsClient => _wsClient;
  LocalPersistenceRepository get persistence => _persistence;
  SensoryService get sensory => _sensory;

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

      state = state.copyWith(
        guestUuid: profile.uuid,
        displayName: profile.displayName,
        avatarId: profile.avatarId,
        coins: profile.coins,
        eloByMode: profile.eloByMode,
        settings: settings,
        seats: updatedSeats,
        matchHistory: history,
      );
    } catch (_) {
      // Safe fallback in test environments where SharedPreferences mock is not yet set
    }
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
  // Navigation & Mode Selection
  // ---------------------------------------------------------------------------

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
    state = state.copyWith(screenState: AppScreenState.lobby);
  }

  void returnToLobby() => goToLobby();

  void goToWaitingRoom({
    HolhuashiGameMode? mode,
    String? roomCode,
    bool isPrivate = true,
  }) {
    _sensory.lightImpact();
    final nextMode = mode ?? state.selectedMode;
    final nextCode = (roomCode != null && roomCode.trim().isNotEmpty)
        ? roomCode.trim().toUpperCase()
        : state.roomCode;
    state = state.copyWith(
      selectedMode: nextMode,
      roomCode: nextCode,
      isPrivateRoom: isPrivate,
      screenState: AppScreenState.waitingRoom,
    );
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
    _sensory.mediumImpact();
    state = state.copyWith(
      selectedMode: mode ?? state.selectedMode,
      screenState: AppScreenState.inGame,
    );
  }

  void startMatch() {
    _sensory.mediumImpact();
    _wsClient.startMatch(roomCode: state.roomCode);
    state = state.copyWith(screenState: AppScreenState.inGame);
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
  }

  @override
  void dispose() {
    _quickChatDismissTimer?.cancel();
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
