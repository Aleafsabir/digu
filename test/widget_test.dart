import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:holhuashi_client/core/audio/sensory_service.dart';
import 'package:holhuashi_client/core/models/card_models.dart';
import 'package:holhuashi_client/core/services/update_service.dart';
import 'package:holhuashi_client/data/local_persistence.dart';
import 'package:holhuashi_client/game/rendering/card_painter.dart';
import 'package:holhuashi_client/game/table_canvas.dart';
import 'package:holhuashi_client/main.dart';
import 'package:holhuashi_client/state/game_session_provider.dart';
import 'package:holhuashi_client/ui/modals/update_prompt_modal.dart';
import 'package:holhuashi_client/ui/screens/auth_screen.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  void configureLandscape(WidgetTester tester) {
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets('HolhuashiApp launches into clean Auth Gateway screen without prohibited strings',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Brand Identity on Auth Gateway
    expect(find.text('ހޮޅުއަށި'), findsOneWidget);
    expect(find.text('HOLHUASHI'), findsOneWidget);
    expect(find.text('Maldivian Card Suite • ޑިގު • ދިހައެއް • ބޮނޑި'), findsOneWidget);

    // Verify 3 Auth Gateway Options
    expect(find.byKey(const Key('btn_sign_in_google')), findsOneWidget);
    expect(find.byKey(const Key('btn_sign_in_apple')), findsOneWidget);
    expect(find.byKey(const Key('btn_sign_in_guest')), findsOneWidget);

    // Verify ZERO prohibited developer / framework strings appear on screen
    expect(find.textContaining('Supabase'), findsNothing);
    expect(find.textContaining('Flame Engine'), findsNothing);
    expect(find.textContaining('SharedPreferences'), findsNothing);
    expect(find.textContaining('Endpoint:'), findsNothing);
    expect(find.textContaining('ދިގު'), findsNothing);
  });

  testWidgets('AuthScreen displays dismissible error banner when auth error occurs',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gameSessionProvider.overrideWith((ref) {
            final persistence = ref.watch(localPersistenceProvider);
            final sensory = ref.watch(sensoryServiceProvider);
            final notifier = GameSessionNotifier(
              persistence: persistence,
              sensory: sensory,
            );
            notifier.state = notifier.state.copyWith(
              authErrorMessage: 'Could not connect to Google Services.',
              screenState: AppScreenState.auth,
            );
            return notifier;
          }),
        ],
        child: const HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Error banner should be visible with close icon
    expect(find.byIcon(Icons.error_outline), findsOneWidget);
    expect(find.text('Could not connect to Google Services.'), findsOneWidget);

    // Tapping close icon clears the error banner
    await tester.tap(find.byIcon(Icons.close));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.error_outline), findsNothing);
  });

  testWidgets('AuthScreen surfaces Save Conflict dialog with comparison and 3 resolution buttons',
      (WidgetTester tester) async {
    configureLandscape(tester);

    final conflict = CloudProfileConflict(
      cloudProfile: const CloudPlayerProfile(
        id: 'c_001',
        displayName: 'Ahmed (Cloud)',
        coins: 10000,
        level: 5,
      ),
      localProfile: const CloudPlayerProfile(
        id: 'local_001',
        displayName: 'Raaveriyaa (Local)',
        coins: 2450,
        level: 1,
      ),
    );

    late GameSessionNotifier capturedNotifier;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gameSessionProvider.overrideWith((ref) {
            final persistence = ref.watch(localPersistenceProvider);
            final sensory = ref.watch(sensoryServiceProvider);
            capturedNotifier = GameSessionNotifier(
              persistence: persistence,
              sensory: sensory,
            );
            return capturedNotifier;
          }),
        ],
        child: const MaterialApp(
          home: AuthScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Trigger state change so ref.listen fires
    capturedNotifier.state = capturedNotifier.state.copyWith(
      pendingCloudConflict: conflict,
    );
    await tester.pumpAndSettle();

    // Verify Conflict Dialog Title & Content
    expect(find.textContaining('SAVE CONFLICT'), findsOneWidget);
    expect(find.text('Keep Cloud Save'), findsOneWidget);
    expect(find.text('Merge Chips & Sync'), findsOneWidget);
    expect(find.text('Keep Local Save'), findsOneWidget);

    // Tap 'Keep Cloud Save' to dismiss and resolve
    await tester.tap(find.text('Keep Cloud Save'));
    await tester.pumpAndSettle();
    expect(find.textContaining('SAVE CONFLICT'), findsNothing);
  });

  testWidgets('Auth Screen signs in as Guest into Minimum-Tap Lobby',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Sign in as Guest
    await tester.tap(find.byKey(const Key('btn_sign_in_guest')));
    await tester.pumpAndSettle();

    // Verify Brand Identity
    expect(find.text('ހޮޅުއަށި'), findsOneWidget);
    expect(find.text('• HOLHUASHI'), findsOneWidget);

    // Verify Fast Re-Entry Pill (1 TAP)
    expect(find.byKey(const Key('btn_quick_play')), findsOneWidget);
    expect(find.text('1 TAP'), findsOneWidget);
    expect(find.textContaining('Quick Play:'), findsOneWidget);

    // Verify Profile & Sync Capsule
    expect(find.byKey(const Key('btn_profile_sync')), findsOneWidget);

    // Verify 3 Hero Game Mode Cards with Authentic Thaana Spelling (ޑިގު)
    expect(find.text('ޑިގު'), findsOneWidget);
    expect(find.text('DIGU'), findsOneWidget);
    expect(find.byKey(const Key('play_solo_digu')), findsOneWidget);
    expect(find.byKey(const Key('private_table_digu')), findsOneWidget);

    expect(find.text('ދިހައެއް'), findsOneWidget);
    expect(find.text('DHIHAEH (10s)'), findsOneWidget);
    expect(find.byKey(const Key('play_solo_dhihaeh')), findsOneWidget);

    expect(find.text('ބޮނޑި'), findsOneWidget);
    expect(find.text('BONDI'), findsOneWidget);
    expect(find.byKey(const Key('play_solo_bondi')), findsOneWidget);
  });

  testWidgets('Lobby Cloud Sync Modal opens from profile capsule without framework internals',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Enter Lobby as Guest
    await tester.tap(find.byKey(const Key('btn_sign_in_guest')));
    await tester.pumpAndSettle();

    // Tap Profile & Sync Capsule
    await tester.tap(find.byKey(const Key('btn_profile_sync')));
    await tester.pumpAndSettle();

    // Verify Modal Header & Clean User-Facing Rows
    expect(find.text('PROFILE & CLOUD SYNC'), findsOneWidget);
    expect(find.text('Account Provider'), findsOneWidget);
    expect(find.text('Cloud Save'), findsOneWidget);
    expect(find.text('Friend Code'), findsOneWidget);
    expect(find.text('Storage Status'), findsOneWidget);

    // Zero internal developer strings
    expect(find.textContaining('Supabase'), findsNothing);
    expect(find.textContaining('SharedPreferences'), findsNothing);

    // Close Modal
    await tester.tap(find.byIcon(Icons.close));
    await tester.pumpAndSettle();
    expect(find.text('PROFILE & CLOUD SYNC'), findsNothing);
  });

  testWidgets('Mode Selection switches selected mode on hero card tap',
      (WidgetTester tester) async {
    configureLandscape(tester);

    late WidgetRef capturedRef;
    await tester.pumpWidget(
      ProviderScope(
        child: Consumer(
          builder: (context, ref, child) {
            capturedRef = ref;
            return const HolhuashiApp();
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Sign in to reach Lobby
    await tester.tap(find.byKey(const Key('btn_sign_in_guest')));
    await tester.pumpAndSettle();

    // Tap DHIHAEH (10s) Card
    await tester.tap(find.text('DHIHAEH (10s)'));
    await tester.pumpAndSettle();
    expect(capturedRef.read(gameSessionProvider).selectedMode,
        equals(HolhuashiGameMode.dhihaeh));

    // Tap BONDI Card
    await tester.tap(find.text('BONDI'));
    await tester.pumpAndSettle();
    expect(capturedRef.read(gameSessionProvider).selectedMode,
        equals(HolhuashiGameMode.bondi));

    // Tap DIGU Card
    await tester.tap(find.text('DIGU'));
    await tester.pumpAndSettle();
    expect(capturedRef.read(gameSessionProvider).selectedMode,
        equals(HolhuashiGameMode.digu));
  });

  testWidgets('Quick Play enters 15s Ready Gate in WaitingRoomScreen before launching GameScreen',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Enter Lobby
    await tester.tap(find.byKey(const Key('btn_sign_in_guest')));
    await tester.pumpAndSettle();

    // Tap Quick Play (1 TAP)
    await tester.tap(find.byKey(const Key('btn_quick_play')));
    await tester.pumpAndSettle();

    // Must be in Waiting Room with Ready Gate (NOT GameScreen directly!)
    expect(find.byKey(const Key('btn_confirm_ready')), findsOneWidget);
    expect(find.textContaining('READY CHECK'), findsOneWidget);

    // Tap Confirm Ready
    await tester.tap(find.byKey(const Key('btn_confirm_ready')));
    // Wait for bots to stagger-ready and gate to complete
    await tester.pump(const Duration(seconds: 2));

    // Dismiss dramatic 3-2-1 countdown overlay if visible
    if (find.textContaining('START').evaluate().isNotEmpty) {
      await tester.tap(find.textContaining('START'));
      await tester.pump(const Duration(milliseconds: 400));
    }

    // Verify Table Canvas & Active Mode Badge with authentic Thaana spelling (ޑިގު • DIGU)
    expect(find.byIcon(Icons.shuffle), findsOneWidget);
    expect(find.byTooltip('Return to Lobby'), findsOneWidget);
    expect(find.text('ޑިގު • DIGU'), findsOneWidget);

    // Return to Lobby
    await tester.tap(find.byTooltip('Return to Lobby'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    expect(find.text('• HOLHUASHI'), findsOneWidget);
  });

  testWidgets('UpdatePromptModal renders version transition, changelog, and download action',
      (WidgetTester tester) async {
    configureLandscape(tester);

    const testInfo = AppUpdateInfo(
      tagName: 'v0.8.5',
      version: '0.8.5',
      releaseName: 'Holhuashi v0.8.5',
      releaseNotes: 'Fixed Maldivian quick chat and ready check countdown',
      apkUrl: 'https://example.com/app-release.apk',
      apkSizeBytes: 14500000,
      htmlUrl: 'https://github.com/Aleafsabir/digu/releases/v0.8.5',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData.dark(),
        home: const Scaffold(
          body: UpdatePromptModal(updateInfo: testInfo),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Modal Header & Version Transition
    expect(find.text('New Update Available!'), findsOneWidget);
    expect(find.text('އައު އަޕްޑޭޓެއް ލިބެން އެބައޮތް!'), findsOneWidget);
    expect(find.text('v0.8.1'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_forward), findsOneWidget);
    expect(find.text('v0.8.5'), findsOneWidget);
    expect(find.text('WHAT\'S NEW • އައު ބަދަލުތައް'), findsOneWidget);
    expect(find.textContaining('Fixed Maldivian quick chat'), findsOneWidget);

    // Verify Action Buttons
    expect(find.byKey(const Key('btn_download_update')), findsOneWidget);
    expect(find.text('LATER • ފަހުން'), findsOneWidget);
  });

  testWidgets('SettingsModal presents controls, update check button, and build version v0.8.1',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Enter Lobby
    await tester.tap(find.byKey(const Key('btn_sign_in_guest')));
    await tester.pumpAndSettle();

    // Tap Settings Button in Top Bar
    await tester.tap(find.byIcon(Icons.settings));
    await tester.pumpAndSettle();

    // Verify Modal Header
    expect(find.text('SETTINGS'), findsOneWidget);
    expect(find.text('ސެޓިންގްސް • AUDIO & PREFERENCES'), findsOneWidget);

    // Verify Volume Sliders and Sensory Toggles
    expect(find.byType(Slider), findsAtLeastNWidgets(2));
    expect(find.text('Sound Effects (SFX)'), findsOneWidget);
    expect(find.text('Background Music (BGM)'), findsOneWidget);
    expect(find.text('Tactile Haptics'), findsOneWidget);
    expect(find.text('Screen Shake'), findsOneWidget);
    expect(find.text('Deal Speed'), findsOneWidget);

    // Verify Application Updates Section & Button
    expect(find.byKey(const Key('btn_check_updates')), findsOneWidget);
    expect(find.textContaining('Current Build: v0.8.1'), findsOneWidget);

    // Close Settings Modal
    await tester.tap(find.byIcon(Icons.close));
    await tester.pumpAndSettle();
    expect(find.text('SETTINGS'), findsNothing);
  });

  test('CardPainter and RoundOverData dual scoring unit validation', () {
    // 1. Verify CardPainter creates painters for spot and court cards
    const kingOfHearts = PlayingCard(id: 'KH', suit: Suit.hearts, rank: 13);
    const tenOfSpades = PlayingCard(id: '10S', suit: Suit.spades, rank: 10);
    const aceOfDiamonds = PlayingCard(id: 'AD', suit: Suit.diamonds, rank: 1);

    final painterKing = CardPainter(card: kingOfHearts);
    final painterTen = CardPainter(card: tenOfSpades);
    final painterAce = CardPainter(card: aceOfDiamonds);

    expect(painterKing.card.rankLabel, equals('K'));
    expect(painterTen.card.rankLabel, equals('10'));
    expect(painterAce.card.rankLabel, equals('A'));

    // 2. Verify RoundOverData holds dual human and opponent scores
    final roundData = RoundOverData(
      humanWon: true,
      winnerName: 'Player (South)',
      winningMelds: [
        [kingOfHearts, tenOfSpades],
      ],
      deadwood: [aceOfDiamonds],
      meldScore: 30,
      debtScore: 1,
      ginBonus: 50,
      netRoundScore: 79,
      humanRoundScore: 80,
      opponentRoundScore: 1,
      mode: HolhuashiGameMode.digu,
      summaryHeadline: 'Gin Slam Victory!',
    );

    expect(roundData.humanRoundScore, equals(80));
    expect(roundData.opponentRoundScore, equals(1));
    expect(roundData.humanWon, isTrue);
  });

  testWidgets('Lobby inline format/variant selectors and 1v1 WaitingRoom compass',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Sign in as Guest
    await tester.tap(find.byKey(const Key('btn_sign_in_guest')));
    await tester.pumpAndSettle();

    // Verify 10-Run chip & inline variant/format pills in Lobby
    expect(find.text('1,000pt 10-Run'), findsOneWidget);
    expect(find.text('1v1'), findsOneWidget);
    expect(find.text('2v2 Partners'), findsOneWidget);
    expect(find.text('4P FFA'), findsOneWidget);
    expect(find.text('Dynamic Cut'), findsOneWidget);
    expect(find.text('Blind Reserve'), findsOneWidget);
    expect(find.text('Standard'), findsOneWidget);
    expect(find.text('Suit Bondi'), findsOneWidget);

    // Select 1v1 Digu format & enter matchmaking
    await tester.tap(find.text('1v1'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('play_solo_digu')));
    await tester.pumpAndSettle();

    // Verify Waiting Room updates cleanly with 1v1 (S & N seats visible, E & W hidden)
    expect(find.text('S'), findsOneWidget);
    expect(find.text('N'), findsOneWidget);
    expect(find.text('E'), findsNothing);
    expect(find.text('W'), findsNothing);
  });
}
