import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';

/// High-fidelity vector card painter replicating the live Digu PlayingCard.tsx exactly.
/// Renders in a canonical 100x148 coordinate space, scaled seamlessly to any resolution.
class CardPainter extends CustomPainter {
  final PlayingCard card;
  final bool isSelected;
  final bool isAceStranded;
  final String? meldType;

  const CardPainter({
    required this.card,
    this.isSelected = false,
    this.isAceStranded = false,
    this.meldType,
  });

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    // Scale from canonical 100x148 to current component size
    final scaleX = size.width / 100.0;
    final scaleY = size.height / 148.0;
    canvas.scale(scaleX, scaleY);

    if (card.isFaceDown) {
      _paintCardBack(canvas);
    } else {
      _paintCardFront(canvas);
    }

    canvas.restore();
  }

  void _paintCardFront(Canvas canvas) {
    const cardRect = Rect.fromLTWH(0, 0, 100, 148);
    final cardRRect = RRect.fromRectAndRadius(cardRect, const Radius.circular(10.0));

    // 1. Card Base: Alabaster cream gradient (like live CSS from-[#ffffff] via-[#fcfaf5] to-[#f4efe4])
    final bgPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFFFFFF), Color(0xFFFCFAF5), Color(0xFFF4EFE4)],
      ).createShader(cardRect)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(cardRRect, bgPaint);

    // 2. Card Border
    final borderPaint = Paint()
      ..color = isSelected
          ? const Color(0xFFE5C378) // Gold Glow
          : const Color(0xFF301A14).withValues(alpha: 0.25)
      ..strokeWidth = isSelected ? 3.0 : 1.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(cardRRect, borderPaint);

    if (isSelected) {
      // Ambient gold glow
      final glowPaint = Paint()
        ..color = const Color(0xFFE5C378).withValues(alpha: 0.5)
        ..maskFilter = const MaskFilter.blur(BlurStyle.outer, 8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0;
      canvas.drawRRect(cardRRect, glowPaint);
    }

    final ink = card.suit.isRed ? const Color(0xFFB91C1C) : const Color(0xFF0F172A);
    const gold = Color(0xFFD4AF37);

    // 3. Top-Left Index (Rank + Mini Suit)
    _drawIndex(canvas, 11, 21, 11, 32, ink, isTop: true);

    // 4. Bottom-Right Inverted Index
    _drawIndex(canvas, 89, 127, 89, 116, ink, isTop: false);

    // 5. Center Artwork
    _drawCenterArtwork(canvas, ink, gold);
  }

  void _drawIndex(Canvas canvas, double textX, double textY, double suitX, double suitY, Color ink, {required bool isTop}) {
    canvas.save();
    if (!isTop) {
      canvas.translate(textX, textY);
      canvas.rotate(math.pi);
      canvas.translate(-textX, -textY);
    }

    // Rank text
    final rankText = card.rankLabel;
    final fontSize = rankText == '10' ? 15.0 : 17.5;
    final textPainter = TextPainter(
      text: TextSpan(
        text: rankText,
        style: TextStyle(
          color: ink,
          fontSize: fontSize,
          fontWeight: FontWeight.w900,
          fontFamily: 'sans-serif',
          letterSpacing: rankText == '10' ? -1.5 : 0.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(canvas, Offset(textX - (textPainter.width / 2), textY - (textPainter.height / 2)));

    // Mini suit pip
    _drawSuit(canvas, card.suit, suitX, suitY, 0.62, ink);

    canvas.restore();
  }

  void _drawCenterArtwork(Canvas canvas, Color ink, Color gold) {
    final rankText = card.rankLabel;

    if (rankText == 'A' && card.suit == Suit.spades) {
      // Royal Ornate Ace of Spades Medallion
      final innerFramePaint = Paint()
        ..color = gold.withValues(alpha: 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.9;
      canvas.drawRRect(
        RRect.fromRectAndRadius(const Rect.fromLTWH(20, 14, 60, 120), const Radius.circular(4)),
        innerFramePaint,
      );

      canvas.save();
      canvas.translate(50, 72);

      final circleBgPaint = Paint()
        ..color = const Color(0xFFFAF6EE)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset.zero, 27, circleBgPaint);

      final dashedGoldCircle = Paint()
        ..color = gold
        ..strokeWidth = 1.2
        ..style = PaintingStyle.stroke;
      canvas.drawCircle(Offset.zero, 27, dashedGoldCircle);

      final innerCirclePaint = Paint()
        ..color = ink.withValues(alpha: 0.4)
        ..strokeWidth = 0.8
        ..style = PaintingStyle.stroke;
      canvas.drawCircle(Offset.zero, 23, innerCirclePaint);

      // Large Ace of Spades Pip
      _drawSuit(canvas, Suit.spades, 0, 4, 1.8, ink);

      // Gold Filigree Accent Ribbon
      final bannerRRect = RRect.fromRectAndRadius(const Rect.fromLTWH(-22, 27, 44, 7), const Radius.circular(2));
      final bannerBg = Paint()
        ..color = const Color(0xFFFAF6EE)
        ..style = PaintingStyle.fill;
      final bannerBorder = Paint()
        ..color = gold
        ..strokeWidth = 1.0
        ..style = PaintingStyle.stroke;
      canvas.drawRRect(bannerRRect, bannerBg);
      canvas.drawRRect(bannerRRect, bannerBorder);

      final textPainter = TextPainter(
        text: const TextSpan(
          text: 'ROYAL DIGU',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 4.8,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      textPainter.paint(canvas, Offset(-textPainter.width / 2, 28.5));

      canvas.restore();
    } else if (rankText == 'A') {
      // Ornate Casino Ace
      final innerFramePaint = Paint()
        ..color = gold.withValues(alpha: 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.9;
      canvas.drawRRect(
        RRect.fromRectAndRadius(const Rect.fromLTWH(20, 14, 60, 120), const Radius.circular(4)),
        innerFramePaint,
      );

      final goldCircle = Paint()
        ..color = gold
        ..strokeWidth = 1.4
        ..style = PaintingStyle.stroke;
      canvas.drawCircle(const Offset(50, 74), 22, goldCircle);

      _drawSuit(canvas, card.suit, 50, 74, 1.55, ink);
    } else if (card.rank >= 11) {
      // Double-Headed Royal Court Portrait Frame
      final courtFrame = RRect.fromRectAndRadius(const Rect.fromLTWH(21, 15, 58, 118), const Radius.circular(3));
      final courtBg = Paint()
        ..color = const Color(0xFFFAF5E8)
        ..style = PaintingStyle.fill;
      final courtBorder = Paint()
        ..color = gold
        ..strokeWidth = 1.5
        ..style = PaintingStyle.stroke;
      canvas.drawRRect(courtFrame, courtBg);
      canvas.drawRRect(courtFrame, courtBorder);

      // Double-ended court silhouette & center suit pips
      _drawSuit(canvas, card.suit, 32, 32, 0.6, ink);
      _drawSuit(canvas, card.suit, 68, 116, 0.6, ink);

      // Centered Royal Monogram
      final monogramPainter = TextPainter(
        text: TextSpan(
          text: rankText,
          style: TextStyle(
            color: ink.withValues(alpha: 0.18),
            fontSize: 42,
            fontWeight: FontWeight.w900,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      monogramPainter.paint(canvas, Offset(50 - (monogramPainter.width / 2), 74 - (monogramPainter.height / 2)));
    } else {
      // Standard Spot Card: Center Large Suit Pip
      _drawSuit(canvas, card.suit, 50, 74, 1.35, ink);
    }
  }

  void _paintCardBack(Canvas canvas) {
    const cardRect = Rect.fromLTWH(0, 0, 100, 148);
    final cardRRect = RRect.fromRectAndRadius(cardRect, const Radius.circular(10.0));

    // 1. Crisp Ivory Outer Poker Border
    final borderPaint = Paint()
      ..color = const Color(0xFFFAF6EE)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(cardRRect, borderPaint);

    // 2. Colored Guilloché Field (Deep Cinnabar #881313)
    final fieldRRect = RRect.fromRectAndRadius(const Rect.fromLTWH(5.5, 5.5, 89, 137), const Radius.circular(6));
    final fieldPaint = Paint()
      ..color = const Color(0xFF881313)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(fieldRRect, fieldPaint);

    // 3. Double Gold Filigree Framing
    const gold = Color(0xFFE5C378);
    const dark = Color(0xFF3B0707);

    final outerFiligree = Paint()
      ..color = gold
      ..strokeWidth = 1.3
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(8.5, 8.5, 83, 131), const Radius.circular(4)),
      outerFiligree,
    );

    final innerFiligree = Paint()
      ..color = gold.withValues(alpha: 0.8)
      ..strokeWidth = 0.6
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(11, 11, 78, 126), const Radius.circular(2.5)),
      innerFiligree,
    );

    // 4. Corner Rosettes
    final rosetteBg = Paint()..color = dark;
    final rosetteStroke = Paint()
      ..color = gold
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    for (final offset in const [
      Offset(16, 16),
      Offset(84, 16),
      Offset(16, 132),
      Offset(84, 132),
    ]) {
      canvas.drawCircle(offset, 3.5, rosetteBg);
      canvas.drawCircle(offset, 3.5, rosetteStroke);
    }

    // 5. Top and Bottom Symmetrical Medallions
    for (final cy in [44.0, 104.0]) {
      canvas.drawCircle(Offset(50, cy), 21, rosetteBg);
      canvas.drawCircle(Offset(50, cy), 21, rosetteStroke);
      canvas.drawCircle(Offset(50, cy), 4.5, Paint()..color = gold);
    }

    // 6. Center DIGU Clasp Band
    final bandRRect = RRect.fromRectAndRadius(const Rect.fromLTWH(28, 68, 44, 12), const Radius.circular(6));
    canvas.drawRRect(bandRRect, rosetteBg);
    canvas.drawRRect(bandRRect, rosetteStroke);

    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'DIGU',
        style: TextStyle(
          color: gold,
          fontSize: 6.5,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.5,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(50 - (textPainter.width / 2), 74 - (textPainter.height / 2)));
  }

  void _drawSuit(Canvas canvas, Suit suit, double cx, double cy, double scale, Color fill) {
    canvas.save();
    canvas.translate(cx, cy);
    canvas.scale(scale);

    final paint = Paint()
      ..color = fill
      ..style = PaintingStyle.fill;

    final path = Path();
    switch (suit) {
      case Suit.spades:
        path.moveTo(0, -11);
        path.cubicTo(-5, -5, -10, -1, -10, 4);
        path.cubicTo(-10, 7.5, -7, 9.5, -4, 9.5);
        path.cubicTo(-2, 9.5, -0.8, 8.5, 0, 7);
        path.cubicTo(0.8, 8.5, 2, 9.5, 4, 9.5);
        path.cubicTo(7, 9.5, 10, 7.5, 10, 4);
        path.cubicTo(10, -1, 5, -5, 0, -11);
        path.close();
        path.moveTo(-1.2, 5.5);
        path.lineTo(-3.5, 11.5);
        path.lineTo(3.5, 11.5);
        path.lineTo(1.2, 5.5);
        path.close();
        break;

      case Suit.hearts:
        path.moveTo(0, -5.5);
        path.cubicTo(-2, -9.5, -6.5, -10.5, -9, -7.5);
        path.cubicTo(-11.5, -4.5, -11, 0.5, -7, 4.5);
        path.lineTo(0, 11.5);
        path.lineTo(7, 4.5);
        path.cubicTo(11, 0.5, 11.5, -4.5, 9, -7.5);
        path.cubicTo(6.5, -10.5, 2, -9.5, 0, -5.5);
        path.close();
        break;

      case Suit.diamonds:
        path.moveTo(0, -11.5);
        path.cubicTo(2.5, -6, 6, -2.5, 10, 0);
        path.cubicTo(6, 2.5, 2.5, 6, 0, 11.5);
        path.cubicTo(-2.5, 6, -6, 2.5, -10, 0);
        path.cubicTo(-6, -2.5, -2.5, -6, 0, -11.5);
        path.close();
        break;

      case Suit.clubs:
        path.addOval(Rect.fromCircle(center: const Offset(0, -5.2), radius: 4.5));
        path.addOval(Rect.fromCircle(center: const Offset(-5, 2), radius: 4.5));
        path.addOval(Rect.fromCircle(center: const Offset(5, 2), radius: 4.5));
        path.moveTo(-1.3, 3.5);
        path.lineTo(-3.5, 11);
        path.lineTo(3.5, 11);
        path.lineTo(1.3, 3.5);
        path.close();
        break;
    }

    canvas.drawPath(path, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CardPainter oldDelegate) {
    return oldDelegate.card.id != card.id ||
        oldDelegate.card.isFaceDown != card.isFaceDown ||
        oldDelegate.isSelected != isSelected ||
        oldDelegate.isAceStranded != isAceStranded ||
        oldDelegate.meldType != meldType;
  }
}
