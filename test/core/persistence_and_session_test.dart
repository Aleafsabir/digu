import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:holhuashi_client/core/audio/sensory_service.dart';
import 'package:holhuashi_client/core/services/cloud_sync_service.dart';
import 'package:holhuashi_client/core/services/google_auth_service.dart';
import 'package:holhuashi_client/core/services/update_service.dart';
import 'package:holhuashi_client/data/local_persistence.dart';
import 'package:holhuashi_client/state/game_session_provider.dart';

class MockGoogleAuthAdapter implements GoogleAuthAdapter {
  GoogleAuthUser? userToReturn;
  Exception? exceptionToThrow;
  bool signedOut = false;

  @override
  Future<GoogleAuthUser?> signIn() async {
    if (exceptionToThrow != null) throw exceptionToThrow!;
    return userToReturn;
  }

  @override
  Future<void> signOut() async {
    signedOut = true;
  }
}

class MockHttpClient extends http.BaseClient {
  final Future<http.Response> Function(http.BaseRequest request) handler;

  MockHttpClient(this.handler);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final response = await handler(request);
    return http.StreamedResponse(
      Stream.value(response.bodyBytes),
      response.statusCode,
      headers: response.headers,
    );
  }
}

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

    test('saveSettings and loadSettings persist custom preferences including authProvider and lastPlayedMode', () async {
      const customSettings = UserSettings(
        sfxVolume: 0.40,
        bgmVolume: 0.20,
        hapticsEnabled: false,
        screenShakeEnabled: false,
        fastDealSpeed: true,
        googleLinked: true,
        appleLinked: true,
        authProvider: 'google',
        userEmail: 'ali.naseer@gmail.com',
        lastPlayedMode: 'bondi',
      );

      await repo.saveSettings(customSettings);
      final loaded = await repo.loadSettings();

      expect(loaded.sfxVolume, closeTo(0.40, 0.001));
      expect(loaded.bgmVolume, closeTo(0.20, 0.001));
      expect(loaded.hapticsEnabled, isFalse);
      expect(loaded.screenShakeEnabled, isFalse);
      expect(loaded.fastDealSpeed, isTrue);
      expect(loaded.googleLinked, isTrue);
      expect(loaded.appleLinked, isTrue);
      expect(loaded.authProvider, equals('google'));
      expect(loaded.userEmail, equals('ali.naseer@gmail.com'));
      expect(loaded.lastPlayedMode, equals('bondi'));
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

  group('UpdateService Tests', () {
    test('isNewerVersion accurately compares semantic versions', () {
      expect(UpdateService.isNewerVersion('v0.8.1', '0.8.0'), isTrue);
      expect(UpdateService.isNewerVersion('v0.8.0', '0.8.0'), isFalse);
      expect(UpdateService.isNewerVersion('v0.7.9', '0.8.0'), isFalse);
      expect(UpdateService.isNewerVersion('v1.0.0', '0.9.5'), isTrue);
      expect(UpdateService.isNewerVersion('0.8.0+2', '0.8.0+1'), isTrue);
      expect(UpdateService.isNewerVersion('0.8.0+1', '0.8.0+2'), isFalse);
    });

    test('parseReleaseJson extracts app-release.apk and ignores draft or older releases', () {
      // Draft release -> null
      final draftJson = {
        'draft': true,
        'tag_name': 'v0.9.0',
        'assets': [
          {'name': 'app-release.apk', 'browser_download_url': 'https://example.com/app-release.apk'}
        ]
      };
      expect(UpdateService.parseReleaseJson(draftJson), isNull);

      // Older release -> null
      final olderJson = {
        'draft': false,
        'tag_name': 'v0.7.0',
        'assets': [
          {'name': 'app-release.apk', 'browser_download_url': 'https://example.com/app-release.apk'}
        ]
      };
      expect(UpdateService.parseReleaseJson(olderJson), isNull);

      // Newer valid release -> extracts AppUpdateInfo with app-release.apk
      final validJson = {
        'draft': false,
        'tag_name': 'v0.8.5',
        'name': 'Tournament Ready v0.8.5',
        'body': 'Added Maldivian quick chat and ready gate',
        'html_url': 'https://github.com/Aleafsabir/digu/releases/v0.8.5',
        'assets': [
          {
            'name': 'other-file.zip',
            'browser_download_url': 'https://example.com/other.zip',
            'size': 1000,
          },
          {
            'name': 'app-release.apk',
            'browser_download_url': 'https://example.com/app-release.apk',
            'size': 15200000,
          }
        ]
      };
      final updateInfo = UpdateService.parseReleaseJson(validJson);
      expect(updateInfo, isNotNull);
      expect(updateInfo!.tagName, equals('v0.8.5'));
      expect(updateInfo.version, equals('0.8.5'));
      expect(updateInfo.apkUrl, equals('https://example.com/app-release.apk'));
      expect(updateInfo.apkSizeBytes, equals(15200000));
      expect(updateInfo.releaseNotes, contains('Maldivian quick chat'));
    });

    test('checkForUpdate respects 4h cooldown and ignored tag unless forced', () async {
      SharedPreferences.setMockInitialValues({});
      final persistence = await LocalPersistenceRepository.create();

      final releasePayload = jsonEncode({
        'draft': false,
        'tag_name': 'v0.9.0',
        'name': 'v0.9.0',
        'body': 'Notes',
        'assets': [
          {'name': 'app-release.apk', 'browser_download_url': 'https://example.com/app.apk', 'size': 5000}
        ]
      });

      final mockClient = MockHttpClient((req) async {
        return http.Response(releasePayload, 200);
      });

      final updateService = UpdateService(
        persistence: persistence,
        client: mockClient,
      );

      // 1. Initial check finds update
      final info1 = await updateService.checkForUpdate(force: true);
      expect(info1, isNotNull);
      expect(info1!.version, equals('0.9.0'));

      // 2. Immediate second check without force hits cooldown
      final info2 = await updateService.checkForUpdate(force: false);
      expect(info2, isNull);

      // 3. Forced check bypasses cooldown
      final info3 = await updateService.checkForUpdate(force: true);
      expect(info3, isNotNull);

      // 4. Ignored tag skips update when force is false
      await updateService.ignoreUpdateTag('v0.9.0');
      await persistence.setLastUpdateCheckMs(0); // reset cooldown
      final info4 = await updateService.checkForUpdate(force: false);
      expect(info4, isNull);

      // 5. Forced check still finds it even if ignored
      final info5 = await updateService.checkForUpdate(force: true);
      expect(info5, isNotNull);
    });
  });

  group('Real Google Sign-In & Cloud Sync Tests', () {
    late LocalPersistenceRepository persistence;
    late SensoryService sensory;
    late MockGoogleAuthAdapter mockGoogleAdapter;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      persistence = await LocalPersistenceRepository.create();
      sensory = SensoryService.instance;
      mockGoogleAdapter = MockGoogleAuthAdapter();
    });

    test('cancellation returns false and keeps state on Auth screen without fake sign-in', () async {
      // Adapter returns null on cancellation
      mockGoogleAdapter.userToReturn = null;

      final googleAuth = GoogleAuthService(adapter: mockGoogleAdapter);
      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        googleAuthService: googleAuth,
      );

      final success = await notifier.signInWithGoogle();
      expect(success, isFalse);
      expect(notifier.state.screenState, equals(AppScreenState.auth));
      expect(notifier.state.authProvider, equals(AuthProviderType.none));
      expect(notifier.state.authBusy, isFalse);
      expect(notifier.state.authErrorMessage, isNull);

      notifier.dispose();
    });

    test('failure populates authErrorMessage and stays signed out', () async {
      mockGoogleAdapter.exceptionToThrow = Exception('Network error during auth');

      final googleAuth = GoogleAuthService(adapter: mockGoogleAdapter);
      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        googleAuthService: googleAuth,
      );

      final success = await notifier.signInWithGoogle();
      expect(success, isFalse);
      expect(notifier.state.screenState, equals(AppScreenState.auth));
      expect(notifier.state.authProvider, equals(AuthProviderType.none));
      expect(notifier.state.authErrorMessage, isNotNull);

      // Clear error
      notifier.clearAuthError();
      expect(notifier.state.authErrorMessage, isNull);

      notifier.dispose();
    });

    test('successful Google auth hydrates cloud profile and navigates to Lobby', () async {
      const testUser = GoogleAuthUser(
        id: 'google_user_001',
        email: 'ali.naseer@gmail.com',
        displayName: 'Ali Naseer',
        idToken: 'token_abc_123',
      );
      mockGoogleAdapter.userToReturn = testUser;

      final mockClient = MockHttpClient((req) async {
        if (req.url.path.contains('/api/profile/google-auth')) {
          return http.Response(
            jsonEncode({
              'exists': true,
              'profile': {
                'id': 'profile_99',
                'displayName': 'Ali Naseer',
                'avatarId': 'boat_builder',
                'loginProvider': 'GOOGLE',
                'googleId': 'google_user_001',
                'email': 'ali.naseer@gmail.com',
                'coins': 8800,
                'level': 4,
                'friendCode': 'HLH-4455',
                'cloudSyncStatus': 'SYNCED',
              }
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final googleAuth = GoogleAuthService(adapter: mockGoogleAdapter);
      final cloudSync = CloudSyncService(client: mockClient);

      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        googleAuthService: googleAuth,
        cloudSyncService: cloudSync,
      );

      final success = await notifier.signInWithGoogle();
      expect(success, isTrue);
      expect(notifier.state.screenState, equals(AppScreenState.lobby));
      expect(notifier.state.authProvider, equals(AuthProviderType.google));
      expect(notifier.state.cloudSyncState, equals(CloudSyncState.synced));
      expect(notifier.state.displayName, equals('Ali Naseer'));
      expect(notifier.state.coins, equals(8800));
      expect(notifier.state.friendCode, equals('HLH-4455'));

      notifier.dispose();
    });

    test('cloud save conflict triggers pendingCloudConflict and resolves cleanly', () async {
      const testUser = GoogleAuthUser(
        id: 'google_user_002',
        email: 'ahmed@gmail.com',
        displayName: 'Ahmed',
        idToken: 'token_xyz',
      );
      mockGoogleAdapter.userToReturn = testUser;

      // Seed local persistence with meaningful local progress so a conflict triggers
      await persistence.setCoins(3000);

      final mockClient = MockHttpClient((req) async {
        if (req.url.path.contains('/api/profile/google-auth')) {
          return http.Response(
            jsonEncode({
              'exists': true,
              'profile': {
                'id': 'cloud_p_01',
                'displayName': 'Ahmed (Cloud)',
                'avatarId': 'maldivian_captain',
                'loginProvider': 'GOOGLE',
                'googleId': 'google_user_002',
                'email': 'ahmed@gmail.com',
                'coins': 12000,
                'level': 5,
                'friendCode': 'HLH-9999',
                'cloudSyncStatus': 'SYNCED',
              }
            }),
            200,
          );
        }
        if (req.url.path.contains('/api/profile/resolve-conflict')) {
          return http.Response(
            jsonEncode({
              'profile': {
                'id': 'cloud_p_01',
                'displayName': 'Ahmed (Cloud)',
                'avatarId': 'maldivian_captain',
                'loginProvider': 'GOOGLE',
                'googleId': 'google_user_002',
                'email': 'ahmed@gmail.com',
                'coins': 15000, // merged: 12000 + 3000
                'level': 5,
                'friendCode': 'HLH-9999',
                'cloudSyncStatus': 'SYNCED',
              }
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final googleAuth = GoogleAuthService(adapter: mockGoogleAdapter);
      final cloudSync = CloudSyncService(client: mockClient);

      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        googleAuthService: googleAuth,
        cloudSyncService: cloudSync,
      );
      await Future<void>.delayed(const Duration(milliseconds: 30));

      final success = await notifier.signInWithGoogle();
      expect(success, isFalse);
      expect(notifier.state.pendingCloudConflict, isNotNull);
      expect(notifier.state.pendingCloudConflict!.cloudProfile.coins, equals(12000));

      // Resolve conflict by merging chips
      await notifier.resolveCloudConflict(keepCloud: true, mergeChips: true);
      expect(notifier.state.pendingCloudConflict, isNull);
      expect(notifier.state.screenState, equals(AppScreenState.lobby));
      expect(notifier.state.coins, equals(15000));
      expect(notifier.state.authProvider, equals(AuthProviderType.google));

      notifier.dispose();
    });
  });

  group('15s Matchmaking Ready Gate Tests', () {
    late LocalPersistenceRepository persistence;
    late SensoryService sensory;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      persistence = await LocalPersistenceRepository.create();
      sensory = SensoryService.instance;
    });

    test('enterMatchmaking initializes Ready Gate and startMatch is blocked until ready', () async {
      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        readyCheckDuration: const Duration(seconds: 15),
      );
      await Future<void>.delayed(const Duration(milliseconds: 30));

      // 1. Enter matchmaking
      notifier.enterMatchmaking(HolhuashiGameMode.digu);
      expect(notifier.state.screenState, equals(AppScreenState.waitingRoom));
      expect(notifier.state.isReadyCheckActive, isTrue);
      expect(notifier.state.southSeat.isReady, isFalse);
      expect(notifier.state.readyCheckSecondsRemaining, equals(15));

      // 2. Calling startMatch while south is NOT ready is blocked
      notifier.startMatch();
      expect(notifier.state.screenState, equals(AppScreenState.waitingRoom));

      // 3. Confirm human ready transitions to inGame once bots are ready
      await notifier.confirmHumanReady();
      expect(notifier.state.southSeat.isReady, isTrue);

      notifier.dispose();
    });

    test('ready check timeout returns to Lobby with cancellation notification', () async {
      // Injected fast duration of 60ms
      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        readyCheckDuration: const Duration(milliseconds: 60),
      );
      await Future<void>.delayed(const Duration(milliseconds: 30));

      notifier.enterMatchmaking(HolhuashiGameMode.bondi);
      expect(notifier.state.screenState, equals(AppScreenState.waitingRoom));

      // Wait for timer expiration
      await Future<void>.delayed(const Duration(milliseconds: 140));

      // Should return to Lobby with notification
      expect(notifier.state.screenState, equals(AppScreenState.lobby));
      expect(notifier.state.isReadyCheckActive, isFalse);
      expect(notifier.state.matchmakingNotification, contains('Match cancelled'));

      notifier.dispose();
    });

    test('leaveWaitingRoom cancels Ready Gate timer and returns to Lobby', () async {
      final notifier = GameSessionNotifier(
        persistence: persistence,
        sensory: sensory,
        readyCheckDuration: const Duration(seconds: 15),
      );
      await Future<void>.delayed(const Duration(milliseconds: 30));

      notifier.enterMatchmaking(HolhuashiGameMode.dhihaeh);
      expect(notifier.state.screenState, equals(AppScreenState.waitingRoom));

      notifier.leaveWaitingRoom();
      expect(notifier.state.screenState, equals(AppScreenState.lobby));
      expect(notifier.state.isReadyCheckActive, isFalse);

      notifier.dispose();
    });
  });

  group('SensoryService & Audio Assets Tests', () {
    test('SensoryService methods execute safely without crash', () async {
      final sensory = SensoryService.instance;
      await sensory.init();

      sensory.applySettings(const UserSettings(
        sfxVolume: 0.5,
        bgmVolume: 0.4,
        hapticsEnabled: true,
      ));

      expect(() => sensory.playLobbyBgm(), returnsNormally);
      expect(() => sensory.playTableBgm(), returnsNormally);
      expect(() => sensory.playDiscardPickup(), returnsNormally);
      expect(() => sensory.playCardDiscard(), returnsNormally);
      expect(() => sensory.playFanReorderTick(), returnsNormally);
      expect(() => sensory.playGinReadyChime(), returnsNormally);
      expect(() => sensory.playUrgentTimerHeartbeat(), returnsNormally);
      expect(() => sensory.playCardSelect(), returnsNormally);
      expect(() => sensory.playButtonTap(), returnsNormally);
      expect(() => sensory.onAppBackgrounded(), returnsNormally);
      expect(() => sensory.onAppForegrounded(), returnsNormally);
      expect(() => sensory.tryUnlockWebAudio(), returnsNormally);
    });

    test('assets/audio contains 13 audio files (2 mp3 and 11 wav)', () {
      final dir = Directory('assets/audio');
      expect(dir.existsSync(), isTrue);

      final files = dir.listSync().whereType<File>().map((f) => f.uri.pathSegments.last).toList();

      expect(files, contains('bgm_lobby.mp3'));
      expect(files, contains('bgm_table.mp3'));
      expect(files, contains('sfx_card_deal.wav'));
      expect(files, contains('sfx_card_discard.wav'));
      expect(files, contains('sfx_card_snap.wav'));
      expect(files, contains('sfx_discard_pickup.wav'));
      expect(files, contains('sfx_fanfare.wav'));
      expect(files, contains('sfx_fan_tick.wav'));
      expect(files, contains('sfx_gin_ready.wav'));
      expect(files, contains('sfx_gin_slam.wav'));
      expect(files, contains('sfx_shuffle.wav'));
      expect(files, contains('sfx_timer_heartbeat.wav'));
      expect(files, contains('sfx_trick_sweep.wav'));
      expect(files.length, equals(13));
    });
  });
}
