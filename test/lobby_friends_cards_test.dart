import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:holhuashi_client/core/audio/sensory_service.dart';
import 'package:holhuashi_client/core/services/cloud_sync_service.dart';
import 'package:holhuashi_client/core/services/update_service.dart';
import 'package:holhuashi_client/data/local_persistence.dart';
import 'package:holhuashi_client/game/table_canvas.dart';
import 'package:holhuashi_client/state/game_session_provider.dart';
import 'package:holhuashi_client/ui/modals/friends_modal.dart';
import 'package:holhuashi_client/ui/overlays/match_invite_toast.dart';
import 'package:holhuashi_client/ui/screens/lobby_screen.dart';
import 'package:holhuashi_client/ui/screens/waiting_room_screen.dart';

class _MockHttpClient extends http.BaseClient {
  final Future<http.Response> Function(http.BaseRequest req) handler;
  _MockHttpClient(this.handler);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final res = await handler(request);
    return http.StreamedResponse(
      Stream.value(res.bodyBytes),
      res.statusCode,
      headers: res.headers,
    );
  }
}

class _TestSessionNotifier extends GameSessionNotifier {
  _TestSessionNotifier({
    required super.persistence,
    required super.sensory,
  });

  void patchState(GameSessionState Function(GameSessionState current) fn) {
    state = fn(state);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Poker Card Sizing & Aspect Ratio', () {
    test('DiguGameTable card dimensions match 100:148 Poker proportions', () {
      expect(DiguGameTable.handCardSize.x, equals(178.0));
      expect(DiguGameTable.handCardSize.y, equals(264.0));
      expect(DiguGameTable.tableCardSize.x, equals(156.0));
      expect(DiguGameTable.tableCardSize.y, equals(230.0));
      expect(DiguGameTable.opponentCardSize.x, equals(122.0));
      expect(DiguGameTable.opponentCardSize.y, equals(180.0));

      final handRatio = DiguGameTable.handCardSize.x / DiguGameTable.handCardSize.y;
      final tableRatio =
          DiguGameTable.tableCardSize.x / DiguGameTable.tableCardSize.y;
      final oppRatio =
          DiguGameTable.opponentCardSize.x / DiguGameTable.opponentCardSize.y;
      expect(handRatio, closeTo(100 / 148, 0.01));
      expect(tableRatio, closeTo(100 / 148, 0.01));
      expect(oppRatio, closeTo(100 / 148, 0.01));
    });
  });

  group('FriendsService HTTP Client Tests', () {
    test('lookupPlayer resolves @handle / UID / HLH-code queries cleanly', () async {
      final client = _MockHttpClient((req) async {
        expect(req.url.path, equals('/api/friends/lookup'));
        expect(req.url.queryParameters['q'], equals('@hassan'));
        return http.Response(
          jsonEncode({
            'target': {
              'id': 'p_hassan',
              'displayName': 'Hassan',
              'username': 'hassan',
              'level': 3,
              'friendCode': 'HLH-12345',
              'presenceStatus': 'IN_LOBBY',
              'relationStatus': 'NONE',
            }
          }),
          200,
        );
      });

      final service = FriendsService(client: client);
      final target = await service.lookupPlayer(
        query: '@hassan',
        requesterId: 'p_me',
      );

      expect(target, isNotNull);
      expect(target!.id, equals('p_hassan'));
      expect(target.username, equals('hassan'));
      expect(target.relationStatus, equals('NONE'));
    });

    test('sendRequest and fetchRequests handle requests bundle', () async {
      final client = _MockHttpClient((req) async {
        if (req.url.path == '/api/friends/request') {
          return http.Response(jsonEncode({'ok': true}), 201);
        }
        if (req.url.path == '/api/friends/requests') {
          return http.Response(
            jsonEncode({
              'incoming': [
                {
                  'requestId': 'req_1',
                  'senderId': 'p_zain',
                  'displayName': 'Zain',
                  'username': 'zain_mv',
                  'friendCode': 'HLH-777',
                }
              ],
              'outgoing': [],
            }),
            200,
          );
        }
        return http.Response('{}', 404);
      });

      final service = FriendsService(client: client);
      await service.sendRequest(profileId: 'p_me', identifier: '@zain_mv');
      final bundle = await service.fetchRequests('p_me');
      expect(bundle.incoming.length, equals(1));
      expect(bundle.incoming.first.username, equals('zain_mv'));
      expect(bundle.outgoing, isEmpty);
    });

    test('CloudSyncService.updateHandle posts and returns normalized username', () async {
      final client = _MockHttpClient((req) async {
        expect(req.url.path, equals('/api/profile/update-handle'));
        return http.Response(jsonEncode({'username': 'aleef_mv'}), 200);
      });

      final sync = CloudSyncService(client: client);
      final saved = await sync.updateHandle(
        profileId: 'p_me',
        username: '@Aleef_MV',
      );
      expect(saved, equals('aleef_mv'));
    });
  });

  group('Concise Lobby, Full-Width Queue & Friends UI Widget Tests', () {
    late LocalPersistenceRepository persistence;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      persistence = await LocalPersistenceRepository.create();
    });

    testWidgets('Lobby renders concise mode cards with Find Match, VS AI, Private Room & Stake strip',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 720);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final notifier = _TestSessionNotifier(
        persistence: persistence,
        sensory: SensoryService.instance,
      );

      final updateService = UpdateService(
        persistence: persistence,
        client: _MockHttpClient((_) async => http.Response('{}', 404)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [gameSessionProvider.overrideWith((_) => notifier)],
          child: MaterialApp(home: LobbyScreen(updateService: updateService)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('btn_friends')), findsOneWidget);
      expect(find.byKey(const Key('find_match_digu')), findsOneWidget);
      expect(find.byKey(const Key('play_solo_digu')), findsOneWidget);
      expect(find.byKey(const Key('private_table_digu')), findsOneWidget);
      expect(find.byKey(const Key('stake_1000')), findsOneWidget);
      expect(find.byKey(const Key('input_join_room_code')), findsOneWidget);
      expect(find.byKey(const Key('btn_join_room_code')), findsOneWidget);

      // Ensure old verbose description taglines were removed
      expect(find.textContaining('Authentic 10-Card Maldivian Rummy'), findsNothing);
      expect(find.textContaining('Fast-paced 4-player trick-shedder'), findsNothing);

      // Tapping VS AI enters instant AI match without waiting queue
      await tester.tap(find.byKey(const Key('play_solo_digu')));
      await tester.pump();
      expect(notifier.state.screenState, equals(AppScreenState.inGame));
    });

    testWidgets('Online Queue WaitingRoom removes right sidebar and toggles Stage-2 Ready Check',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 720);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final notifier = _TestSessionNotifier(
        persistence: persistence,
        sensory: SensoryService.instance,
      );

      notifier.patchState((s) => s.copyWith(
            screenState: AppScreenState.waitingRoom,
            selectedMode: HolhuashiGameMode.digu,
            diguFormat: DiguTableFormat.freeForAll4p,
            isPrivateRoom: false,
            fillEmptySeatsWithBots: false,
            isReadyCheckActive: false,
            seats: {
              CompassSeat.south: const SeatOccupant(
                seat: CompassSeat.south,
                displayName: 'Raaveriyaa',
                subtitle: 'YOU',
                isHuman: true,
                isReady: false,
              ),
              CompassSeat.east: SeatOccupant.open(CompassSeat.east),
              CompassSeat.north: SeatOccupant.open(CompassSeat.north),
              CompassSeat.west: SeatOccupant.open(CompassSeat.west),
            },
          ));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [gameSessionProvider.overrideWith((_) => notifier)],
          child: const MaterialApp(home: WaitingRoomScreen()),
        ),
      );
      await tester.pump();

      expect(find.byKey(const Key('online_queue_slots_panel')), findsOneWidget);
      expect(find.byKey(const Key('queue_searching_bar')), findsOneWidget);
      expect(find.byKey(const Key('private_room_controls')), findsNothing);
      expect(find.text('Searching for players... (1/4)'), findsOneWidget);
      expect(find.text('Open Seat'), findsNWidgets(3));

      // Trigger Stage-2 Ready Check
      notifier.beginStage2ReadyCheck(seconds: 15);
      await tester.pump();

      expect(find.byKey(const Key('ready_check_bar')), findsOneWidget);
      expect(find.byKey(const Key('btn_confirm_ready')), findsOneWidget);
      expect(find.byKey(const Key('btn_decline_ready')), findsOneWidget);
    });

    testWidgets('1v1 Online Queue WaitingRoom renders S & N seats and hides E & W seats',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 720);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final notifier = _TestSessionNotifier(
        persistence: persistence,
        sensory: SensoryService.instance,
      );

      notifier.patchState((s) => s.copyWith(
            screenState: AppScreenState.waitingRoom,
            selectedMode: HolhuashiGameMode.digu,
            diguFormat: DiguTableFormat.duel1v1,
            isPrivateRoom: false,
            fillEmptySeatsWithBots: false,
            isReadyCheckActive: false,
            seats: {
              CompassSeat.south: const SeatOccupant(
                seat: CompassSeat.south,
                displayName: 'Raaveriyaa',
                subtitle: 'YOU',
                isHuman: true,
                isReady: false,
              ),
              CompassSeat.north: SeatOccupant.open(CompassSeat.north),
            },
          ));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [gameSessionProvider.overrideWith((_) => notifier)],
          child: const MaterialApp(home: WaitingRoomScreen()),
        ),
      );
      await tester.pump();

      expect(find.text('Searching for players... (1/2)'), findsOneWidget);
      expect(find.text('S'), findsOneWidget);
      expect(find.text('N'), findsOneWidget);
      expect(find.text('E'), findsNothing);
      expect(find.text('W'), findsNothing);
    });

    testWidgets('Private Room disables Start Match until Fill AI Bots is switched on',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 720);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final notifier = _TestSessionNotifier(
        persistence: persistence,
        sensory: SensoryService.instance,
      );

      notifier.patchState((s) => s.copyWith(
            screenState: AppScreenState.waitingRoom,
            selectedMode: HolhuashiGameMode.bondi,
            isPrivateRoom: true,
            fillEmptySeatsWithBots: false,
            seats: {
              CompassSeat.south: const SeatOccupant(
                seat: CompassSeat.south,
                displayName: 'Raaveriyaa',
                subtitle: 'HOST',
                isHuman: true,
                isReady: true,
              ),
              CompassSeat.east: SeatOccupant.open(CompassSeat.east),
              CompassSeat.north: SeatOccupant.open(CompassSeat.north),
              CompassSeat.west: SeatOccupant.open(CompassSeat.west),
            },
          ));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [gameSessionProvider.overrideWith((_) => notifier)],
          child: const MaterialApp(home: WaitingRoomScreen()),
        ),
      );
      await tester.pump();

      expect(find.byKey(const Key('private_room_controls')), findsOneWidget);
      final startBtnBefore = tester.widget<ElevatedButton>(
        find.byKey(const Key('btn_start_private_match')),
      );
      expect(startBtnBefore.onPressed, isNull);

      await tester.tap(find.byKey(const Key('switch_fill_bots')));
      await tester.pump();

      final startBtnAfter = tester.widget<ElevatedButton>(
        find.byKey(const Key('btn_start_private_match')),
      );
      expect(startBtnAfter.onPressed, isNotNull);
    });

    testWidgets('FriendsModal gates Guest behind Google Sign-In and shows handle/tabs when synced',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 720);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final notifier = _TestSessionNotifier(
        persistence: persistence,
        sensory: SensoryService.instance,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [gameSessionProvider.overrideWith((_) => notifier)],
          child: const MaterialApp(home: Scaffold(body: FriendsModal())),
        ),
      );
      await tester.pump();

      // Guest gate
      expect(find.byKey(const Key('btn_friends_google_signin')), findsOneWidget);
      expect(find.byKey(const Key('tab_friends')), findsNothing);

      // Switch to synced Google user with @handle & 1 friend
      notifier.patchState((s) => s.copyWith(
            authProvider: AuthProviderType.google,
            cloudSyncState: CloudSyncState.synced,
            cloudProfileId: 'prof_aleef',
            username: 'aleef_mv',
            friendCode: 'HLH-88888',
            friends: const [
              FriendEntry(
                friendshipId: 'f1',
                friendId: 'p2',
                displayName: 'Mariyam',
                username: 'mariyam',
                presenceStatus: 'IN_MATCH',
              ),
            ],
          ));
      await tester.pump();

      expect(find.byKey(const Key('pill_my_handle')), findsOneWidget);
      expect(find.text('@aleef_mv'), findsOneWidget);
      expect(find.byKey(const Key('tab_friends')), findsOneWidget);
      expect(find.text('Mariyam'), findsOneWidget);
      expect(find.text('@mariyam • In Match'), findsOneWidget);
    });

    testWidgets('MatchInviteToast displays invite details and handles Decline',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 720);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final notifier = _TestSessionNotifier(
        persistence: persistence,
        sensory: SensoryService.instance,
      );

      notifier.patchState((s) => s.copyWith(
            pendingMatchInvite: MatchInviteEntry(
              id: 'inv_1',
              roomCode: 'XYZ999',
              senderId: 'p_friend',
              senderName: 'Aishath',
              senderUsername: 'aisha',
              mode: 'DIGU',
              format: '2v2',
              stakeBuyIn: 5000,
              expiresAt: DateTime.now().add(const Duration(seconds: 20)),
            ),
          ));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [gameSessionProvider.overrideWith((_) => notifier)],
          child: const MaterialApp(
            home: Scaffold(body: Stack(children: [MatchInviteToast()])),
          ),
        ),
      );
      await tester.pump();

      expect(find.byKey(const Key('match_invite_toast')), findsOneWidget);
      expect(find.textContaining('Aishath (@aisha)'), findsOneWidget);
      expect(find.byKey(const Key('btn_accept_match_invite')), findsOneWidget);
      expect(find.byKey(const Key('btn_decline_match_invite')), findsOneWidget);

      await tester.tap(find.byKey(const Key('btn_decline_match_invite')));
      await tester.pump();
      expect(notifier.state.pendingMatchInvite, isNull);
    });
  });
}
