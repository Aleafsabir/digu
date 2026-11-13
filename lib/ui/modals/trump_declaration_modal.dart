import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../../game/rendering/card_painter.dart';

class TrumpDeclarationModal extends StatefulWidget {
  final Suit? trumpSuit;
  final String declarerName;
  final VoidCallback? onDismiss;
  final ValueChanged<Suit>? onSuitSelected;
  final List<PlayingCard>? pass1Cards;
  final bool isHumanDeclarer;

  const TrumpDeclarationModal({
    super.key,
    this.trumpSuit,
    required this.declarerName,
    this.onDismiss,
    this.onSuitSelected,
    this.pass1Cards,
    this.isHumanDeclarer = false,
  });

  @override
  State<TrumpDeclarationModal> createState() => _TrumpDeclarationModalState();
}

class _TrumpDeclarationModalState extends State<TrumpDeclarationModal> {
  Suit? _selectedSuit;

  @override
  void initState() {
    super.initState();
    _selectedSuit = widget.trumpSuit ?? Suit.spades;
  }

  @override
  Widget build(BuildContext context) {
    final isInteractive = widget.isHumanDeclarer && widget.onSuitSelected != null;
    final activeSuit = isInteractive ? _selectedSuit! : (widget.trumpSuit ?? Suit.spades);
    final suitColor = activeSuit.isRed ? const Color(0xFFC84B31) : const Color(0xFFE5C378);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
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
            // Fanfare Emblem / Icon
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF1F0A07),
                border: Border.all(color: const Color(0xFFE5C378), width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                activeSuit.symbol,
                style: TextStyle(
                  fontSize: 30,
                  color: suitColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Thaana Callout
            Text(
              isInteractive ? 'ހުކުމް ކަނޑައަޅުއްވާ' : 'ހުކުމް ކަނޑައެޅިއްޖެ',
              textDirection: TextDirection.rtl,
              style: const TextStyle(
                color: Color(0xFFE5C378),
                fontSize: 20,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),

            // Title
            Text(
              isInteractive
                  ? 'DECLARE TRUMP SUIT (5-CARD PASS 1)'
                  : 'TRUMP DECLARED: ${activeSuit.name.toUpperCase()}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 6),

            Text(
              isInteractive
                  ? 'Inspect your 5 opening cards below and choose the winning trump suit.'
                  : 'Declared by ${widget.declarerName} on first 5-card packet inspection.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xB2F7F0EA),
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 12),

            // If Pass 1 cards available, display thumbnail strip
            if (widget.pass1Cards != null && widget.pass1Cards!.isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'YOUR 5-CARD OPENING PACKET',
                  style: TextStyle(
                    color: Color(0xFFD4AF37),
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: widget.pass1Cards!.map((card) {
                    return Container(
                      margin: const EdgeInsets.only(right: 6),
                      width: 44,
                      height: 64,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: (card.suit == _selectedSuit)
                              ? const Color(0xFFE5C378)
                              : Colors.white24,
                          width: (card.suit == _selectedSuit) ? 1.8 : 0.8,
                        ),
                      ),
                      child: CustomPaint(
                        painter: CardPainter(card: card),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Interactive 4-Suit Selection Buttons
            if (isInteractive) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: Suit.values.map((s) {
                  final isSelected = s == _selectedSuit;
                  final isRed = s.isRed;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedSuit = s;
                      });
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF380C10)
                            : const Color(0xFF140506),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFFD4AF37)
                              : const Color(0xFF380C10),
                          width: isSelected ? 2.0 : 1.0,
                        ),
                        boxShadow: isSelected
                            ? [
                                const BoxShadow(
                                  color: Color(0x66D4AF37),
                                  blurRadius: 12,
                                ),
                              ]
                            : null,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            s.symbol,
                            style: TextStyle(
                              fontSize: 26,
                              color: isRed
                                  ? const Color(0xFFC84B31)
                                  : const Color(0xFFE5C378),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _suitThaanaName(s),
                            textDirection: TextDirection.rtl,
                            style: TextStyle(
                              fontSize: 11,
                              color: isSelected
                                  ? const Color(0xFFE5C378)
                                  : const Color(0x99F7F0EA),
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),
            ],

            // Action Button
            SizedBox(
              width: double.infinity,
              height: 40,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE5C378),
                  foregroundColor: const Color(0xFF0D0605),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: () {
                  if (isInteractive) {
                    widget.onSuitSelected?.call(_selectedSuit!);
                  } else {
                    widget.onDismiss?.call();
                  }
                },
                child: Text(
                  isInteractive
                      ? 'CONFIRM TRUMP: ${_selectedSuit?.name.toUpperCase()} ➜'
                      : 'RESUME PASS 2 DEAL',
                  style: const TextStyle(
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

  static String _suitThaanaName(Suit suit) {
    switch (suit) {
      case Suit.spades:
        return 'އޮޅު';
      case Suit.hearts:
        return 'ހިތް';
      case Suit.diamonds:
        return 'ބުރު';
      case Suit.clubs:
        return 'ކަނދި';
    }
  }
}
