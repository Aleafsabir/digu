import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:holhuashi_client/main.dart';

void main() {
  testWidgets('HolhuashiApp loads game table surface without errors',
      (WidgetTester tester) async {
    // Calibrate landscape screen size for tablet/phone
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );

    // Verify brand and table elements load
    expect(find.text('ހޮޅުއަށި'), findsOneWidget);
    expect(find.textContaining('Digu'), findsOneWidget);
    expect(find.text('MELDS'), findsOneWidget);
    expect(find.text('SUIT'), findsOneWidget);
    expect(find.text('RANK'), findsOneWidget);
  });
}
