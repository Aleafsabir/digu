import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:holhuashi_client/main.dart';

void main() {
  testWidgets('HolhuashiApp loads game table surface without errors',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: HolhuashiApp(),
      ),
    );

    // Verify title bar loads
    expect(find.text('ހޮޅުއަށި'), findsOneWidget);
    expect(find.text('| Digu (Solo 2P)'), findsOneWidget);
  });
}
