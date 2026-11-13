import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:holhuashi_client/core/models/card_models.dart';
import 'package:holhuashi_client/game/rendering/card_painter.dart';
import 'package:holhuashi_client/game/table_canvas.dart';
import 'package:holhuashi_client/main.dart';
import 'package:holhuashi_client/state/game_session_provider.dart';

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

  testWidgets('HolhuashiApp launches into Auth Gateway screen with Google, Apple, and Guest options',
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
    expect(find.text('HOLHUASHI: Maldivian Card Suite'), findsOneWidget);

    // Verify 3 Auth Gateway Options
    expect(find.byKey(const Key('btn_sign_in_google')), findsOneWidget);
    expect(find.byKey(const Key('btn_sign_in_apple')), findsOneWidget);
    expect(find.byKey(const Key('btn_sign_in_guest')), findsOneWidget);

    // Verify Backend Status Footer
    expect(find.textContaining('Supabase Cloud Sync'), findsOneWidget);
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

  testWidgets('Lobby Cloud Sync Modal opens and shows account details',
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

    // Verify Modal Header & Details
    expect(find.text('PROFILE & CLOUD SYNC'), findsOneWidget);
    expect(find.text('Account Provider'), findsOneWidget);
    expect(find.text('Local Cache'), findsOneWidget);
    expect(find.text('Cloud Backend'), findsOneWidget);

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

  testWidgets('Waiting Room displays 4 compass seats, room code, and controls',
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

    // Navigate to Waiting Room via DIGU private table button
    await tester.tap(find.byKey(const Key('private_table_digu')));
    await tester.pumpAndSettle();

    // Verify Room Code Header and Controls
    expect(find.text('ROOM: '), findsOneWidget);
    expect(find.text('COPY LINK'), findsOneWidget);
    expect(find.text('LOBBY'), findsOneWidget);

    // Verify 4 Compass Seat Placards
    expect(find.text('S'), findsOneWidget);
    expect(find.text('N'), findsOneWidget);
    expect(find.text('E'), findsOneWidget);
    expect(find.text('W'), findsOneWidget);

    // Verify Match Rules Controls
    expect(find.text('MATCH RULES'), findsOneWidget);
    expect(find.text('TARGET SCORE'), findsOneWidget);
    expect(find.text('TURN CLOCK'), findsOneWidget);
    expect(find.text('Fill Empty Seats'), findsOneWidget);

    // Verify Start Match Action
    expect(find.text('ފަށާ • START MATCH'), findsOneWidget);

    // Return to Lobby
    await tester.tap(find.text('LOBBY'));
    await tester.pumpAndSettle();
    expect(find.text('• HOLHUASHI'), findsOneWidget);
  });

  testWidgets('Settings Modal opens from Lobby and presents sliders & switches',
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
    expect(find.textContaining('Guest Profile'), findsOneWidget);

    // Close Settings Modal
    await tester.tap(find.byIcon(Icons.close));
    await tester.pumpAndSettle();
    expect(find.text('SETTINGS'), findsNothing);
  });

  testWidgets('Quick Play launches GameScreen with table canvas, countdown, and active mode badge',
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
    await tester.pump(const Duration(milliseconds: 100));

    // Dismiss dramatic 3-2-1 countdown overlay if visible
    if (find.textContaining('START').evaluate().isNotEmpty) {
      await tester.tap(find.textContaining('START'));
      await tester.pump(const Duration(milliseconds: 400));
    }

    // Verify Table Canvas Elements and Controls
    expect(find.byIcon(Icons.shuffle), findsOneWidget);
    expect(find.byTooltip('Return to Lobby'), findsOneWidget);

    // Verify Active Mode Badge with authentic Thaana spelling (ޑިގު • DIGU)
    expect(find.text('ޑިގު • DIGU'), findsOneWidget);

    // Return to Lobby
    await tester.tap(find.byTooltip('Return to Lobby'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    expect(find.text('• HOLHUASHI'), findsOneWidget);
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
}
