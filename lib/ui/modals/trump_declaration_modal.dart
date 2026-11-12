import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';

class TrumpDeclarationModal extends StatelessWidget {
  final Suit trumpSuit;
  final String declarerName;
  final VoidCallback onDismiss;

  const TrumpDeclarationModal({
    super.key,
    required this.trumpSuit,
    required this.declarerName,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final suitColor = trumpSuit.isRed ? const Color(0xFFC84B31) : const Color(0xFFE5C378);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        width: 420,
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF2A0E08), Color(0xFF170704), Color(0xFF0D0302)],
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE5C378), width: 2.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.95),
              blurRadius: 40,
              spreadRadius: 8,
            ),
            BoxShadow(
              color: const Color(0xFFE5C378).withValues(alpha: 0.25),
              blurRadius: 30,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Fanfare Emblem
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF1F0A07),
                border: Border.all(color: const Color(0xFFE5C378), width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                trumpSuit.symbol,
                style: TextStyle(
                  fontSize: 32,
                  color: suitColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Thaana Callout
            const Text(
              'ހުކުމް ކަނޑައެޅިއްޖެ',
              textDirection: TextDirection.rtl,
              style: TextStyle(
                color: Color(0xFFE5C378),
                fontSize: 20,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),

            // English Title
            Text(
              'TRUMP DECLARED: ${trumpSuit.name.toUpperCase()}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
                fontFamily: 'serif',
              ),
            ),
            const SizedBox(height: 8),

            Text(
              'Declared by $declarerName on first 5-card packet inspection.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xB2F7F0EA),
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 18),

            // Dismiss Button
            SizedBox(
              width: double.infinity,
              height: 38,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE5C378),
                  foregroundColor: const Color(0xFF0D0605),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: onDismiss,
                child: const Text(
                  'RESUME PASS 2 DEAL',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
