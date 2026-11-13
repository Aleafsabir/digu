import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';

/// High-fidelity vector card painter replicating the live Digu PlayingCard.tsx exactly.
/// Renders in a canonical 100x148 coordinate space, scaled seamlessly to any resolution.
class CardPainter extends CustomPainter {
  final PlayingCard card;
  final bool isSelected;
  final bool isPlayable;
  final bool isWinnerHighlight;
  final bool isAceStranded;
  final String? meldType;

  const CardPainter({
    required this.card,
    this.isSelected = false,
    this.isPlayable = true,
    this.isWinnerHighlight = false,
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
    } else if (!isPlayable) {
      // Opaque dark backing prevents underlying fanned cards from bleeding through
      const cardRect = Rect.fromLTWH(0, 0, 100, 148);
      final cardRRect = RRect.fromRectAndRadius(cardRect, const Radius.circular(10.0));
      canvas.drawRRect(cardRRect, Paint()..color = const Color(0xFF140807));

      // Dim non-playable card to 50% opacity
      canvas.saveLayer(
        cardRect,
        Paint()..color = const Color.fromRGBO(255, 255, 255, 0.5),
      );
      _paintCardFront(canvas);
      canvas.restore();
    } else {
      _paintCardFront(canvas);
    }

    if (isWinnerHighlight && !card.isFaceDown) {
      _paintWinnerRimHighlight(canvas);
    }

    canvas.restore();
  }

  void _paintWinnerRimHighlight(Canvas canvas) {
    const cardRect = Rect.fromLTWH(0, 0, 100, 148);
    final cardRRect = RRect.fromRectAndRadius(cardRect, const Radius.circular(10.0));

    final outerGlow = Paint()
      ..color = const Color(0xFFE5C378).withValues(alpha: 0.85)
      ..maskFilter = const MaskFilter.blur(BlurStyle.outer, 12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5.0;
    canvas.drawRRect(cardRRect, outerGlow);

    final rimPaint = Paint()
      ..color = const Color(0xFFFFE082)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4;
    canvas.drawRRect(cardRRect, rimPaint);
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
      _drawCourtArtwork(canvas, ink, gold);
    } else {
      _drawSpotPips(canvas, ink);
    }
  }

  void _drawSpotPips(Canvas canvas, Color ink) {
    final pips = <(double, double)>[];
    switch (card.rank) {
      case 2:
        pips.addAll(const [(50, 32), (50, 116)]);
        break;
      case 3:
        pips.addAll(const [(50, 32), (50, 74), (50, 116)]);
        break;
      case 4:
        pips.addAll(const [(34, 32), (66, 32), (34, 116), (66, 116)]);
        break;
      case 5:
        pips.addAll(const [
          (34, 32),
          (66, 32),
          (50, 74),
          (34, 116),
          (66, 116),
        ]);
        break;
      case 6:
        pips.addAll(const [
          (34, 32),
          (66, 32),
          (34, 74),
          (66, 74),
          (34, 116),
          (66, 116),
        ]);
        break;
      case 7:
        pips.addAll(const [
          (34, 32),
          (66, 32),
          (50, 46),
          (34, 74),
          (66, 74),
          (34, 116),
          (66, 116),
        ]);
        break;
      case 8:
        pips.addAll(const [
          (34, 32),
          (66, 32),
          (50, 46),
          (34, 74),
          (66, 74),
          (50, 102),
          (34, 116),
          (66, 116),
        ]);
        break;
      case 9:
        pips.addAll(const [
          (34, 32),
          (66, 32),
          (34, 60),
          (66, 60),
          (50, 74),
          (34, 88),
          (66, 88),
          (34, 116),
          (66, 116),
        ]);
        break;
      case 10:
        pips.addAll(const [
          (34, 32),
          (66, 32),
          (50, 46),
          (34, 60),
          (66, 60),
          (34, 88),
          (66, 88),
          (50, 102),
          (34, 116),
          (66, 116),
        ]);
        break;
    }

    for (final (px, py) in pips) {
      if (py > 74) {
        canvas.save();
        canvas.translate(px, py);
        canvas.rotate(math.pi);
        _drawSuit(canvas, card.suit, 0, 0, 0.78, ink);
        canvas.restore();
      } else {
        _drawSuit(canvas, card.suit, px, py, 0.78, ink);
      }
    }
  }

  void _drawCourtArtwork(Canvas canvas, Color ink, Color gold) {
    const courtRect = Rect.fromLTWH(22, 16, 56, 116);
    final courtRRect = RRect.fromRectAndRadius(courtRect, const Radius.circular(3));

    canvas.drawRRect(
      courtRRect,
      Paint()
        ..color = const Color(0xFFFAF5E8)
        ..style = PaintingStyle.fill,
    );

    canvas.save();
    canvas.clipRRect(courtRRect);

    // Subtle guilloché frame accent inside portrait box
    canvas.drawRect(
      courtRect.deflate(2.0),
      Paint()
        ..color = gold.withValues(alpha: 0.35)
        ..strokeWidth = 0.6
        ..style = PaintingStyle.stroke,
    );

    // Top upright royal half (clipped cleanly above diagonal split line)
    final topClip = Path()
      ..moveTo(22, 16)
      ..lineTo(78, 16)
      ..lineTo(78, 67)
      ..lineTo(22, 81)
      ..close();
    canvas.save();
    canvas.clipPath(topClip);
    _drawRoyalCourtHalf(canvas, ink, gold);
    canvas.restore();

    // Bottom 180-deg rotated royal half (symmetrical around (50, 74))
    canvas.save();
    canvas.translate(50, 74);
    canvas.rotate(math.pi);
    canvas.translate(-50, -74);
    canvas.clipPath(topClip);
    _drawRoyalCourtHalf(canvas, ink, gold);
    canvas.restore();

    // Diagonal split divider sash
    canvas.drawLine(
      const Offset(22, 81),
      const Offset(78, 67),
      Paint()
        ..color = const Color(0xFF1E293B)
        ..strokeWidth = 2.4,
    );
    canvas.drawLine(
      const Offset(22, 81),
      const Offset(78, 67),
      Paint()
        ..color = gold
        ..strokeWidth = 1.2,
    );

    canvas.restore();

    // Outer gold frame border
    canvas.drawRRect(
      courtRRect,
      Paint()
        ..color = gold
        ..strokeWidth = 1.5
        ..style = PaintingStyle.stroke,
    );
  }

  void _drawRoyalCourtHalf(Canvas canvas, Color ink, Color gold) {
    const crimson = Color(0xFF991B1B);
    const navy = Color(0xFF1E293B);
    const skin = Color(0xFFF3D5B5);

    final primaryTunic = card.suit.isRed ? crimson : navy;
    final secondaryTunic = card.suit.isRed ? navy : crimson;

    // Corner suit pip (maps to (32, 30) upright and (68, 118) rotated 180°)
    _drawSuit(canvas, card.suit, 32, 30, 0.56, ink);

    // Patterned royal tunic & shoulders
    final tunicPath = Path()
      ..moveTo(29, 82)
      ..lineTo(35, 53)
      ..lineTo(65, 53)
      ..lineTo(71, 82)
      ..close();
    canvas.drawPath(tunicPath, Paint()..color = primaryTunic);

    // Secondary royal mantle panel
    final mantlePath = Path()
      ..moveTo(41, 53)
      ..lineTo(59, 53)
      ..lineTo(63, 82)
      ..lineTo(37, 82)
      ..close();
    canvas.drawPath(mantlePath, Paint()..color = secondaryTunic);

    // Gold tunic lattice / diamond embroidery
    final latticePaint = Paint()
      ..color = gold.withValues(alpha: 0.78)
      ..strokeWidth = 0.85
      ..style = PaintingStyle.stroke;
    canvas.drawLine(const Offset(42, 55), const Offset(50, 64), latticePaint);
    canvas.drawLine(const Offset(58, 55), const Offset(50, 64), latticePaint);
    canvas.drawLine(const Offset(50, 64), const Offset(41, 74), latticePaint);
    canvas.drawLine(const Offset(50, 64), const Offset(59, 74), latticePaint);
    canvas.drawLine(const Offset(35, 53), const Offset(65, 53), latticePaint);

    // Central gold royal stole & jewel studs
    canvas.drawRect(
      const Rect.fromLTWH(48, 53, 4, 28),
      Paint()..color = gold,
    );
    canvas.drawCircle(const Offset(50, 60), 1.3, Paint()..color = crimson);
    canvas.drawCircle(const Offset(50, 67), 1.3, Paint()..color = navy);

    // Royal ermine collar
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(41, 50, 18, 4.5),
        const Radius.circular(2),
      ),
      Paint()..color = const Color(0xFFFAF5E8),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(41, 50, 18, 4.5),
        const Radius.circular(2),
      ),
      Paint()
        ..color = gold
        ..strokeWidth = 0.7
        ..style = PaintingStyle.stroke,
    );

    // Bust / Head silhouette
    canvas.drawOval(
      const Rect.fromLTWH(43.5, 36, 13, 15),
      Paint()..color = skin,
    );
    canvas.drawOval(
      const Rect.fromLTWH(43.5, 36, 13, 15),
      Paint()
        ..color = navy.withValues(alpha: 0.55)
        ..strokeWidth = 0.7
        ..style = PaintingStyle.stroke,
    );

    // Royal hair / beard framing
    final hairPaint = Paint()..color = navy;
    canvas.drawArc(
      const Rect.fromLTWH(42.5, 35.5, 15, 11),
      math.pi,
      math.pi,
      false,
      Paint()
        ..color = navy
        ..strokeWidth = 2.0
        ..style = PaintingStyle.stroke,
    );
    if (card.rank == 13) {
      // King's royal beard accent
      final beard = Path()
        ..moveTo(45, 47)
        ..lineTo(50, 52.5)
        ..lineTo(55, 47)
        ..close();
      canvas.drawPath(beard, hairPaint);
    }

    // Facial symmetry details (brows & eyes)
    canvas.drawCircle(const Offset(47.3, 42.5), 0.7, hairPaint);
    canvas.drawCircle(const Offset(52.7, 42.5), 0.7, hairPaint);

    // Royal Crown / Coronet / Heraldic Cap silhouette
    final crownPath = Path();
    if (card.rank == 13) {
      // King: 3-peaked high royal crown
      crownPath
        ..moveTo(42, 36.5)
        ..lineTo(41, 25.5)
        ..lineTo(46, 30.5)
        ..lineTo(50, 23.0)
        ..lineTo(54, 30.5)
        ..lineTo(59, 25.5)
        ..lineTo(58, 36.5)
        ..close();
    } else if (card.rank == 12) {
      // Queen: arched coronet tiara
      crownPath
        ..moveTo(42.5, 36.5)
        ..lineTo(43.5, 28.0)
        ..lineTo(47, 31.5)
        ..lineTo(50, 24.5)
        ..lineTo(53, 31.5)
        ..lineTo(56.5, 28.0)
        ..lineTo(57.5, 36.5)
        ..close();
    } else {
      // Jack: heraldic royal cap with plume crest
      crownPath
        ..moveTo(42, 36.5)
        ..lineTo(43, 29.0)
        ..lineTo(50, 26.5)
        ..lineTo(57, 29.0)
        ..lineTo(58, 36.5)
        ..close();
    }

    canvas.drawPath(crownPath, Paint()..color = gold);
    canvas.drawPath(
      crownPath,
      Paint()
        ..color = navy
        ..strokeWidth = 0.75
        ..style = PaintingStyle.stroke,
    );

    // Crown crimson & navy band accents
    canvas.drawRect(
      const Rect.fromLTWH(42.5, 34, 15, 2.3),
      Paint()..color = crimson,
    );
    canvas.drawCircle(const Offset(50, 35.1), 0.9, Paint()..color = gold);
    if (card.rank >= 12) {
      canvas.drawCircle(const Offset(50, 23.8), 1.1, Paint()..color = crimson);
    } else {
      // Jack's crimson feather plume
      final plume = Path()
        ..moveTo(54, 29)
        ..quadraticBezierTo(62, 22, 66, 26)
        ..quadraticBezierTo(61, 28, 56, 31)
        ..close();
      canvas.drawPath(plume, Paint()..color = crimson);
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
        oldDelegate.isPlayable != isPlayable ||
        oldDelegate.isWinnerHighlight != isWinnerHighlight ||
        oldDelegate.isAceStranded != isAceStranded ||
        oldDelegate.meldType != meldType;
  }
}
