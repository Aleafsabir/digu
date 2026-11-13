import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:holhuashi_client/core/audio/sensory_service.dart';
import 'package:holhuashi_client/data/local_persistence.dart';
import 'package:holhuashi_client/state/game_session_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('LocalPersistenceRepository Tests', () {
    late LocalPersistenceRepository repo;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      repo = await LocalPersistenceRepository.create();
    });

    test('ensureGuestProfileInitialized creates valid defaults', () async {
      final profile = await repo.loadProfile();
      expect(profile.uuid, isNotEmpty);
      expect(profile.displayName, equals('Raaveriyaa'));
      expect(profile.avatarId, equals('maldivian_captain'));
      expect(profile.coins, equals(2450));
      expect(profile.eloByMode['digu'], equals(1284));
      expect(profile.eloByMode['dhihaeh'], equals(1320));
      expect(profile.eloByMode['bondi'], equals(1195));
    });

    test('profile attributes can be updated and retrieved', () async {
      await repo.setDisplayName('DhivehiPlayer');
      await repo.setAvatarId('boat_builder');
      await repo.setCoins(3500);

      expect(await repo.getDisplayName(), equals('DhivehiPlayer'));
      expect(await repo.getAvatarId(), equals('boat_builder'));
      expect(await repo.getCoins(), equals(3500));
    });

    test('saveEloMap and updateModeElo adjust per-mode ratings', () async {
      await repo.updateModeElo('digu', 32);
      await repo.updateModeElo('bondi', -15);

      final eloMap = await repo.loadEloMap();
      expect(eloMap['digu'], equals(1284 + 32));
      expect(eloMap['bondi'], equals(1195 - 15));
      expect(eloMap['dhihaeh'], equals(1320));
    });

    test('saveSettings and loadSettings persist custom preferences', () async {
      const customSettings = UserSettings(
        sfxVolume: 0.40,
        bgmVolume: 0.20,
        hapticsEnabled: false,
        screenShakeEnabled: false,
        fastDealSpeed: true,
        googleLinked: true,
      );

      await repo.saveSettings(customSettings);
      final loaded = await repo.loadSettings();

      expect(loaded.sfxVolume, closeTo(0.40, 0.001));
      expect(loaded.bgmVolume, closeTo(0.20, 0.001));
      expect(loaded.hapticsEnabled, isFalse);
      expect(loaded.screenShakeEnabled, isFalse);
      expect(loaded.fastDealSpeed, isTrue);
      expect(loaded.googleLinked, isTrue);
    });

    test('offline match history records can be appended and loaded', () async {
      final record = OfflineMatchRecord(
        matchId: 'match_1001',
        gameMode: 'dhihaeh',
        won: true,
        humanScore: 1000,
        opponentScore: 4,
        eloDelta: 24,
        timestamp: DateTime(2026, 11, 13, 10, 0),
      );

      await repo.appendMatchRecord(record);
      final history = await repo.loadMatchHistory();

      expect(history.length, equals(1));
      expect(history.first.matchId, equals('match_1001'));
      expect(history.first.gameMode, equals('dhihaeh'));
      expect(history.first.won, isTrue);
      expect(history.first.humanScore, equals(1000));
      expect(history.first.opponentScore, equals(4));
    });

    test('active match snapshot can be saved, read, and cleared', () async {
      final snapshot = {
        'mode': 'digu',
        'round': 2,
        'deadwood': 14,
        'hand': ['AS', 'KS', 'QS'],
      };

      await repo.saveActiveMatchSnapshot(snapshot);
      final loaded = await repo.loadActiveMatchSnapshot();
      expect(loaded, isNotNull);
      expect(loaded!['mode'], equals('digu'));
      expect(loaded['round'], equals(2));

      await repo.clearActiveMatchSnapshot();
      final cleared = await repo.loadActiveMatchSnapshot();
      expect(cleared, isNull);
    });
  });

  group('GameSessionNotifier & State Tests', () {
    late LocalPersistenceRepository persistence;
    late SensoryService sensory;
    late GameSessionNotifier notifier;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      persistence = await LocalPersistenceRepository.create();
      sensory = SensoryService.instance;
      notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
      );
      // Wait for async init in notifier
      await Future<void>.delayed(const Duration(milliseconds: 50));
    });

    tearDown(() {
      notifier.dispose();
    });

    test('initial state defaults to Main Lobby and DIGU mode', () {
      final state = notifier.state;
      expect(state.screenState, equals(AppScreenState.lobby));
      expect(state.selectedMode, equals(HolhuashiGameMode.digu));
      expect(state.roomCode, equals('MLD842'));
      expect(state.targetScore, equals(500));
      expect(state.turnTimerSeconds, equals(15));
      expect(state.fillEmptySeatsWithBots, isTrue);

      // Verify 4 compass seats
      expect(state.seats.length, equals(4));
      expect(state.seats[CompassSeat.south]!.isHuman, isTrue);
      expect(state.seats[CompassSeat.north]!.isBot, isTrue);
      expect(state.seats[CompassSeat.east]!.isBot, isTrue);
      expect(state.seats[CompassSeat.west]!.isBot, isTrue);
    });

    test('Mode Selection toggles between DIGU, DHIHAEH (10s), and BONDI', () {
      notifier.selectGameMode(HolhuashiGameMode.dhihaeh);
      expect(notifier.state.selectedMode, equals(HolhuashiGameMode.dhihaeh));
      expect(notifier.state.eloForMode(HolhuashiGameMode.dhihaeh), equals(1320));

      notifier.selectGameMode(HolhuashiGameMode.bondi);
      expect(notifier.state.selectedMode, equals(HolhuashiGameMode.bondi));
      expect(notifier.state.eloForMode(HolhuashiGameMode.bondi), equals(1195));

      notifier.selectGameMode(HolhuashiGameMode.digu);
      expect(notifier.state.selectedMode, equals(HolhuashiGameMode.digu));
      expect(notifier.state.eloForMode(HolhuashiGameMode.digu), equals(1284));
    });

    test('navigation flows between Lobby, Waiting Room, and InGame', () {
      // 1. Go to Waiting Room
      notifier.goToWaitingRoom(mode: HolhuashiGameMode.dhihaeh, isPrivate: true);
      expect(notifier.state.screenState, equals(AppScreenState.waitingRoom));
      expect(notifier.state.selectedMode, equals(HolhuashiGameMode.dhihaeh));
      expect(notifier.state.isPrivateRoom, isTrue);

      // 2. Return to Lobby
      notifier.goToLobby();
      expect(notifier.state.screenState, equals(AppScreenState.lobby));

      // 3. Online matchmaking opens waiting room
      notifier.startOnlineMatchmaking(HolhuashiGameMode.bondi);
      expect(notifier.state.screenState, equals(AppScreenState.waitingRoom));
      expect(notifier.state.selectedMode, equals(HolhuashiGameMode.bondi));
      expect(notifier.state.isPrivateRoom, isFalse);

      // 4. Start match launches game
      notifier.startMatch();
      expect(notifier.state.screenState, equals(AppScreenState.inGame));

      // 5. Return to lobby from game
      notifier.returnToLobby();
      expect(notifier.state.screenState, equals(AppScreenState.lobby));

      // 6. Solo match starts directly inGame
      notifier.startSoloMatch(HolhuashiGameMode.digu);
      expect(notifier.state.screenState, equals(AppScreenState.inGame));
      expect(notifier.state.selectedMode, equals(HolhuashiGameMode.digu));
    });

    test('Waiting Room controls configure match rules', () {
      // Regenerate room code produces valid 6-char alphanumeric code
      final newCode = notifier.regenerateRoomCode();
      expect(newCode.length, equals(6));
      expect(notifier.state.roomCode, equals(newCode));
      expect(notifier.state.shareableInviteLink, contains('room=$newCode'));

      // Toggle Target Score (500 <-> 1000)
      notifier.setTargetScore(500);
      notifier.toggleTargetScore();
      expect(notifier.state.targetScore, equals(1000));
      notifier.toggleTargetScore();
      expect(notifier.state.targetScore, equals(500));

      // Toggle Turn Clock (15 <-> 30)
      notifier.setTurnTimer(15);
      notifier.toggleTurnTimer();
      expect(notifier.state.turnTimerSeconds, equals(30));
      notifier.toggleTurnTimer();
      expect(notifier.state.turnTimerSeconds, equals(15));

      // Toggle autofill AI bots
      notifier.setFillEmptySeatsWithBots(false);
      expect(notifier.state.fillEmptySeatsWithBots, isFalse);

      // Claim seat & toggle ready
      notifier.claimSeat(CompassSeat.north);
      expect(notifier.state.seats[CompassSeat.north]!.isHuman, isTrue);
      expect(notifier.state.seats[CompassSeat.south]!.isHuman, isFalse);

      notifier.toggleReady(CompassSeat.north);
      expect(notifier.state.seats[CompassSeat.north]!.isReady, isFalse);
      notifier.toggleReady(CompassSeat.north);
      expect(notifier.state.seats[CompassSeat.north]!.isReady, isTrue);
    });

    test('Settings updates modify state and persist changes', () async {
      notifier.setSfxVolume(0.35);
      expect(notifier.state.sfxVolume, closeTo(0.35, 0.001));

      notifier.setBgmVolume(0.50);
      expect(notifier.state.bgmVolume, closeTo(0.50, 0.001));

      notifier.toggleHaptics();
      expect(notifier.state.hapticsEnabled, isFalse);

      notifier.toggleScreenShake();
      expect(notifier.state.screenShakeEnabled, isFalse);

      notifier.toggleFastDealSpeed();
      expect(notifier.state.fastDealSpeed, isTrue);

      notifier.toggleGoogleLinked();
      expect(notifier.state.googleLinked, isTrue);

      // Verify persistence received updated settings
      final persisted = await persistence.loadSettings();
      expect(persisted.sfxVolume, closeTo(0.35, 0.001));
      expect(persisted.fastDealSpeed, isTrue);
      expect(persisted.googleLinked, isTrue);
    });

    test('Quick chat emits and dispatches messages with auto-expiry', () {
      final preset = kHolhuashiQuickChatPresets.first;
      notifier.sendQuickChat(preset, seat: CompassSeat.south);

      expect(notifier.state.activeQuickChat, isNotNull);
      expect(notifier.state.activeQuickChat!.thaana, equals(preset.thaana));
      expect(notifier.state.quickChatHistory.length, equals(1));

      notifier.dismissQuickChat();
      expect(notifier.state.activeQuickChat, isNull);
    });

    test('recordMatchResult awards coins, updates ELO, and logs history', () async {
      final initialCoins = notifier.state.coins;
      final initialDiguElo = notifier.state.diguElo;

      await notifier.recordMatchResult(
        mode: HolhuashiGameMode.digu,
        humanWon: true,
        humanScore: 120,
        opponentScore: 45,
      );

      expect(notifier.state.coins, equals(initialCoins + 150));
      expect(notifier.state.diguElo, equals(initialDiguElo + 16));
      expect(notifier.state.matchHistory.length, equals(1));
      expect(notifier.state.matchHistory.first.won, isTrue);
    });
  });
}
