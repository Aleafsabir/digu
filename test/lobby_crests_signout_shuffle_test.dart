import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:holhuashi_client/core/audio/sensory_service.dart';
import 'package:holhuashi_client/core/models/card_models.dart';
import 'package:holhuashi_client/data/local_persistence.dart';
import 'package:holhuashi_client/game/table_canvas.dart';
import 'package:holhuashi_client/main.dart';
import 'package:holhuashi_client/state/game_session_provider.dart';
import 'package:holhuashi_client/ui/screens/auth_screen.dart';
import 'package:holhuashi_client/ui/screens/lobby_screen.dart';
import 'package:holhuashi_client/ui/widgets/mode_crest_artwork.dart';

class _TestSessionNotifier extends GameSessionNotifier {
  _TestSessionNotifier({
    required super.persistence,
    required super.sensory,
  });

  void patchState(GameSessionState Function(GameSessionState) updater) {
    state = updater(state);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Card Crests Lobby, Settings Sign-Out & Empty Stock Shuffle Tests', () {
    late LocalPersistenceRepository persistence;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      persistence = await LocalPersistenceRepository.create();
    });

    testWidgets(
      'Lobby renders 3 bespoke ModeCrestArtwork cards cleanly on desktop & compact landscape',
      (tester) async {
        for (final size in const [
          Size(1280, 720),
          Size(932, 430),
          Size(850, 390),
        ]) {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1.0;
          addTearDown(tester.view.reset);

          final notifier = _TestSessionNotifier(
            persistence: persistence,
            sensory: SensoryService.instance,
          );
          notifier.patchState(
            (s) => s.copyWith(
              screenState: AppScreenState.lobby,
              diguFormat: DiguTableFormat.partners2v2,
            ),
          );

          await tester.pumpWidget(
            ProviderScope(
              overrides: [gameSessionProvider.overrideWith((_) => notifier)],
              child: const MaterialApp(home: LobbyScreen()),
            ),
          );
          await tester.pump();

          expect(find.byType(ModeCrestArtwork), findsNWidgets(3));
          expect(find.byKey(const Key('btn_sign_out')), findsNothing);
          expect(find.text('2v2 Partners'), findsOneWidget);
          expect(find.byKey(const Key('input_join_room_code')), findsOneWidget);
          expect(find.byKey(const Key('btn_join_room_code')), findsOneWidget);
        }
      },
    );

    testWidgets(
      'Settings Sign Out requires confirmation dialog before returning to AuthScreen',
      (tester) async {
        tester.view.physicalSize = const Size(1280, 720);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        final notifier = _TestSessionNotifier(
          persistence: persistence,
          sensory: SensoryService.instance,
        );
        notifier.patchState((s) => s.copyWith(screenState: AppScreenState.lobby));

        await tester.pumpWidget(
          ProviderScope(
            overrides: [gameSessionProvider.overrideWith((_) => notifier)],
            child: const HolhuashiApp(),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(LobbyScreen), findsOneWidget);
        expect(find.byKey(const Key('btn_sign_out')), findsNothing);

        // Open SettingsModal
        await tester.tap(find.byKey(const Key('btn_settings')));
        await tester.pumpAndSettle();

        final signOutBtn = find.byKey(const Key('btn_settings_sign_out'));
        expect(signOutBtn, findsOneWidget);
        await tester.ensureVisible(signOutBtn);
        await tester.tap(signOutBtn);
        await tester.pumpAndSettle();

        // Confirmation dialog appears; Cancel keeps session active
        expect(find.byKey(const Key('dialog_sign_out_confirm')), findsOneWidget);
        await tester.tap(find.byKey(const Key('btn_cancel_sign_out')));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('dialog_sign_out_confirm')), findsNothing);
        expect(notifier.state.screenState, equals(AppScreenState.lobby));

        // Open confirmation dialog again and confirm Sign Out
        await tester.tap(signOutBtn);
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('dialog_sign_out_confirm')), findsOneWidget);

        await tester.tap(find.byKey(const Key('btn_confirm_sign_out')));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('dialog_sign_out_confirm')), findsNothing);
        expect(notifier.state.screenState, equals(AppScreenState.auth));
        expect(find.byType(AuthScreen), findsOneWidget);
      },
    );

    testWidgets(
      'Empty stock in Digu waits for player choice and Shuffle & Draw recycles remaining discards cleanly',
      (tester) async {
        tester.view.physicalSize = const Size(1280, 720);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        final notifier = _TestSessionNotifier(
          persistence: persistence,
          sensory: SensoryService.instance,
        );
        notifier.patchState(
          (s) => s.copyWith(
            screenState: AppScreenState.inGame,
            selectedMode: HolhuashiGameMode.digu,
            diguFormat: DiguTableFormat.duel1v1,
          ),
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [gameSessionProvider.overrideWith((_) => notifier)],
            child: const HolhuashiApp(),
          ),
        );
        await tester.pump();

        // Tap countdown overlay to start deal immediately and cancel countdown timer
        await tester.tap(find.text('ފަށާ • START!'));
        await tester.pump(const Duration(milliseconds: 500));

        final gameWidget = tester.widget<GameWidget<DiguGameTable>>(
          find.byType(GameWidget<DiguGameTable>),
        );
        final table = gameWidget.game ?? gameWidget.gameFactory!();

        // Simulate stock reaching 0 with 3 discards on human draw turn
        table.stockPile.clear();
        table.discardPile
          ..clear()
          ..addAll(const [
            PlayingCard(id: 'C4', suit: Suit.clubs, rank: 4),
            PlayingCard(id: 'H7', suit: Suit.hearts, rank: 7),
            PlayingCard(id: 'S12', suit: Suit.spades, rank: 12),
          ]);
        table.phase = GameTurnPhase.awaitDraw;
        table.phaseNotifier.value = GameTurnPhase.awaitDraw;
        table.stockCountNotifier.value = 0;
        table.discardCountNotifier.value = 3;
        await tester.pump();

        // Right-side Shuffle & Draw button appears only when stock==0 & discard>1 on awaitDraw
        final shuffleBtn = find.byKey(const Key('btn_empty_stock_shuffle'));
        expect(shuffleBtn, findsOneWidget);

        // Tapping empty stock directly MUST NOT auto-shuffle discards
        final handCountBefore = table.currentHand.length;
        table.drawCardFromStock();
        await tester.pump();
        expect(table.stockPile, isEmpty);
        expect(table.discardPile.length, equals(3));
        expect(table.currentHand.length, equals(handCountBefore));
        expect(table.phaseNotifier.value, equals(GameTurnPhase.awaitDraw));

        // Tapping right-side Shuffle & Draw keeps top discard (Q♠), shuffles remaining 2, draws 1
        await tester.tap(shuffleBtn);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));

        expect(table.currentHand.length, equals(handCountBefore + 1));
        expect(table.discardPile.length, equals(1));
        expect(table.discardPile.last.suit, equals(Suit.spades));
        expect(table.discardPile.last.rank, equals(12));
        expect(table.stockPile.length, equals(1));
        expect(table.phaseNotifier.value, equals(GameTurnPhase.awaitAction));
        expect(shuffleBtn, findsNothing);

        // Also confirm button stays hidden when only 1 discard card remains & stock is empty
        table.stockPile.clear();
        table.stockCountNotifier.value = 0;
        table.discardCountNotifier.value = 1;
        table.phase = GameTurnPhase.awaitDraw;
        table.phaseNotifier.value = GameTurnPhase.awaitDraw;
        await tester.pump();
        expect(shuffleBtn, findsNothing);
      },
    );
  });
}
