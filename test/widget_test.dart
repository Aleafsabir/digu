import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  testWidgets('HolhuashiApp loads Main Lobby with brand, coins, and 3 mode cards',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Brand Identity
    expect(find.text('ހޮޅުއަށި'), findsOneWidget);
    expect(find.text('• HOLHUASHI'), findsOneWidget);

    // Verify Coins and Profile Pill
    expect(find.text('Raaveriyaa'), findsOneWidget);
    expect(find.text('2450'), findsOneWidget);

    // Verify 3 Game Mode Cards
    expect(find.text('DIGU'), findsOneWidget);
    expect(find.text('DHIHAEH (10s)'), findsOneWidget);
    expect(find.text('BONDI'), findsOneWidget);

    // Verify Rule Highlights
    expect(find.textContaining('DEADWOOD'), findsWidgets);

    // Verify Launch Bar
    expect(find.text('PRIVATE TABLE'), findsOneWidget);
    expect(find.text('PLAY SOLO VS BOTS'), findsOneWidget);
    expect(find.text('ONLINE MATCHMAKING'), findsOneWidget);
  });

  testWidgets('Mode Selection switches selected mode on card tap',
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

    // Navigate to Waiting Room via Private Table button
    await tester.tap(find.text('PRIVATE TABLE'));
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
    expect(find.text('Raaveriyaa'), findsOneWidget);

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

  testWidgets('Play Solo launches GameScreen with table canvas and HUD',
      (WidgetTester tester) async {
    configureLandscape(tester);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Tap PLAY SOLO VS BOTS
    await tester.tap(find.text('PLAY SOLO VS BOTS'));
    await tester.pump(const Duration(milliseconds: 100));

    // Dismiss dramatic 3-2-1 countdown overlay if visible
    if (find.textContaining('START').evaluate().isNotEmpty) {
      await tester.tap(find.textContaining('START'));
      await tester.pump(const Duration(milliseconds: 400));
    }

    // Verify Table Elements and Controls
    expect(find.byIcon(Icons.shuffle), findsOneWidget);
    expect(find.byTooltip('Return to Lobby'), findsOneWidget);
    expect(find.text('DIGU'), findsOneWidget);
    expect(find.text('DHIHAEH (10s)'), findsOneWidget);
    expect(find.text('BONDI'), findsOneWidget);

    // Return to Lobby
    await tester.tap(find.byTooltip('Return to Lobby'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    expect(find.text('• HOLHUASHI'), findsOneWidget);
  });
}
