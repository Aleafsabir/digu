import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';

/// High-performance procedural vector card painter.
/// Draws cards directly to the GPU via Flutter's Path & Canvas APIs with zero raster texture overhead.
class CardPainter extends CustomPainter {
  final PlayingCard card;
  final bool isSelected;
  final Color borderColor;

  const CardPainter({
    required this.card,
    this.isSelected = false,
    this.borderColor = const Color(0xFFD4AF37), // Royal Lacquer Gold
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(8.0));

    if (card.isFaceDown) {
      _paintCardBack(canvas, rrect, size);
      return;
    }

    _paintCardFront(canvas, rrect, size);
  }

  void _paintCardFront(Canvas canvas, RRect rrect, Size size) {
    // 1. Card Body Background
    final bgPaint = Paint()
      ..color = const Color(0xFFFAF9F6) // Alabaster card stock
      ..style = PaintingStyle.fill;
    canvas.drawRRect(rrect, bgPaint);

    // 2. Card Border (Gold or Selected Glow)
    final borderPaint = Paint()
      ..color = isSelected ? const Color(0xFF00E5FF) : borderColor.withValues(alpha: 0.6)
      ..strokeWidth = isSelected ? 2.5 : 1.0
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(rrect, borderPaint);

    final suitColor = card.suit.isRed
        ? const Color(0xFFD32F2F) // Luxury Crimson Red
        : const Color(0xFF1E232A); // Midnight Onyx

    // 3. Top-Left Corner Rank & Suit
    _drawCornerPip(canvas, size, suitColor, isTopLeft: true);

    // 4. Bottom-Right Inverted Corner Rank & Suit
    _drawCornerPip(canvas, size, suitColor, isTopLeft: false);

    // 5. Center Suit Emblem / Court Monogram
    _drawCenterEmblem(canvas, size, suitColor);
  }

  void _drawCornerPip(Canvas canvas, Size size, Color color, {required bool isTopLeft}) {
    canvas.save();
    if (!isTopLeft) {
      canvas.translate(size.width, size.height);
      canvas.rotate(math.pi);
    }

    // Rank text
    final textPainter = TextPainter(
      text: TextSpan(
        text: card.rankLabel,
        style: TextStyle(
          color: color,
          fontSize: size.height * 0.16,
          fontWeight: FontWeight.w800,
          fontFamily: 'Roboto',
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(canvas, Offset(size.width * 0.08, size.height * 0.05));

    // Mini suit pip below rank
    canvas.save();
    canvas.translate(
      size.width * 0.08 + (textPainter.width / 2),
      size.height * 0.06 + textPainter.height + 4,
    );
    canvas.scale((size.height * 0.005) / 2);
    _drawSuitPath(canvas, card.suit, color);
    canvas.restore();

    canvas.restore();
  }

  void _drawCenterEmblem(Canvas canvas, Size size, Color color) {
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    final scale = (size.height * 0.02) / 2;
    canvas.scale(scale);

    if (card.rank >= 11) {
      // Court card: draw monogram
      final monogramPainter = TextPainter(
        text: TextSpan(
          text: card.rankLabel,
          style: TextStyle(
            color: color.withValues(alpha: 0.15),
            fontSize: 28,
            fontWeight: FontWeight.w900,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      monogramPainter.paint(
        canvas,
        Offset(-monogramPainter.width / 2, -monogramPainter.height / 2),
      );
    }

    _drawSuitPath(canvas, card.suit, color);
    canvas.restore();
  }

  void _paintCardBack(Canvas canvas, RRect rrect, Size size) {
    // Royal Cinnabar Lacquer finish
    final bgPaint = Paint()
      ..color = const Color(0xFF7A0C16) // Deep Cinnabar
      ..style = PaintingStyle.fill;
    canvas.drawRRect(rrect, bgPaint);

    // Inset border
    final inset = rrect.deflate(size.width * 0.08);
    final borderPaint = Paint()
      ..color = const Color(0xFFD4AF37) // Gold border
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(inset, borderPaint);

    // Center lacquer lattice emblem
    final centerPaint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawCircle(
      Offset(size.width / 2, size.height / 2),
      size.width * 0.22,
      centerPaint,
    );
  }

  void _drawSuitPath(Canvas canvas, Suit suit, Color color) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = Path();
    switch (suit) {
      case Suit.spades:
        // Spades vector path
        path.moveTo(0, -11);
        path.cubicTo(-5, -5, -10, -1, -10, 4);
        path.cubicTo(-10, 7.5, -7, 9.5, -4, 9.5);
        path.cubicTo(-2, 9.5, -0.8, 8.5, 0, 7);
        path.cubicTo(0.8, 8.5, 2, 9.5, 4, 9.5);
        path.cubicTo(7, 9.5, 10, 7.5, 10, 4);
        path.cubicTo(10, -1, 5, -5, 0, -11);
        path.close();
        // Stem
        path.moveTo(-1.2, 5.5);
        path.lineTo(-3.5, 11.5);
        path.lineTo(3.5, 11.5);
        path.lineTo(1.2, 5.5);
        path.close();
        break;

      case Suit.hearts:
        // Hearts vector path
        path.moveTo(0, -3);
        path.cubicTo(-2, -7, -6, -10, -10, -10);
        path.cubicTo(-15, -10, -18, -6, -18, -1);
        path.cubicTo(-18, 6, -11, 12, 0, 19);
        path.cubicTo(11, 12, 18, 6, 18, -1);
        path.cubicTo(18, -6, 15, -10, 10, -10);
        path.cubicTo(6, -10, 2, -7, 0, -3);
        path.close();
        break;

      case Suit.diamonds:
        // Diamonds rhombus vector path
        path.moveTo(0, -13);
        path.lineTo(9, 0);
        path.lineTo(0, 13);
        path.lineTo(-9, 0);
        path.close();
        break;

      case Suit.clubs:
        // Clubs three-lobed clover with stem
        path.addOval(Rect.fromCircle(center: const Offset(0, -6), radius: 5.5));
        path.addOval(Rect.fromCircle(center: const Offset(-6, 2), radius: 5.5));
        path.addOval(Rect.fromCircle(center: const Offset(6, 2), radius: 5.5));
        // Stem
        path.moveTo(-1.5, 3.5);
        path.lineTo(-3.5, 12);
        path.lineTo(3.5, 12);
        path.lineTo(1.5, 3.5);
        path.close();
        break;
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CardPainter oldDelegate) {
    return oldDelegate.card.id != card.id ||
        oldDelegate.card.isFaceDown != card.isFaceDown ||
        oldDelegate.isSelected != isSelected ||
        oldDelegate.borderColor != borderColor;
  }
}
