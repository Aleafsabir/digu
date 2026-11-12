import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../../game/rendering/card_painter.dart';

class RoundScoreModal extends StatelessWidget {
  final bool humanWon;
  final String winnerName;
  final List<List<PlayingCard>> winningMelds;
  final List<PlayingCard> deadwood;
  final int meldScore;
  final int debtScore;
  final int ginBonus;
  final int netRoundScore;
  final int humanCumulativeScore;
  final int botCumulativeScore;
  final VoidCallback onNextRound;

  const RoundScoreModal({
    super.key,
    required this.humanWon,
    required this.winnerName,
    required this.winningMelds,
    required this.deadwood,
    required this.meldScore,
    required this.debtScore,
    required this.ginBonus,
    required this.netRoundScore,
    required this.humanCumulativeScore,
    required this.botCumulativeScore,
    required this.onNextRound,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 720),
        decoration: BoxDecoration(
          color: const Color(0xF7170B09),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE5C378), width: 2),
          boxShadow: [
            BoxShadow(
              color: (humanWon ? const Color(0xFFE5C378) : Colors.red).withValues(alpha: 0.35),
              blurRadius: 30,
              spreadRadius: 2,
            ),
          ],
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  humanWon ? '⚡ GIN VICTORY! ⚡' : 'ROUND FINISHED',
                  style: TextStyle(
                    color: humanWon ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '$winnerName has slammed the winning hand!',
              style: const TextStyle(
                color: Color(0xB3F7F0EA),
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),

            // Melds Display
            if (winningMelds.isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'WINNING MELDS (0 DEADWOOD)',
                  style: TextStyle(
                    color: Color(0xFFE5C378),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: winningMelds.map((meld) {
                    return Container(
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE5C378).withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        children: meld.map((card) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2),
                            child: SizedBox(
                              width: 38,
                              height: 56,
                              child: CustomPaint(
                                painter: CardPainter(card: card),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Score Card Breakdown Table
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0D0605),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF301A14)),
              ),
              child: Column(
                children: [
                  _buildScoreRow('Meld Points', '+$meldScore pts', const Color(0xFFE5C378)),
                  if (ginBonus > 0)
                    _buildScoreRow('Gin Bonus', '+$ginBonus pts', const Color(0xFF00E5FF)),
                  if (debtScore > 0)
                    _buildScoreRow('Deadwood Debt', '-$debtScore pts', const Color(0xFFC84B31)),
                  const Divider(color: Color(0xFF301A14), height: 16),
                  _buildScoreRow(
                    'Net Round Score',
                    '${netRoundScore > 0 ? '+' : ''}$netRoundScore pts',
                    humanWon ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                    isBold: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Cumulative Match Score Pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF170B09),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF301A14)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Text(
                    'YOU: $humanCumulativeScore pts',
                    style: const TextStyle(
                      color: Color(0xFFE5C378),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                  const Text(
                    'vs',
                    style: TextStyle(color: Colors.white38, fontSize: 11),
                  ),
                  Text(
                    'BOT: $botCumulativeScore pts',
                    style: const TextStyle(
                      color: Color(0xFFF7F0EA),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Next Round Action Button
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE5C378),
                foregroundColor: const Color(0xFF0D0605),
                padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 6,
              ),
              onPressed: onNextRound,
              child: const Text(
                'CONTINUE TO NEXT ROUND ➜',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreRow(String label, String value, Color color, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white70,
              fontSize: 12,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: isBold ? FontWeight.w900 : FontWeight.w700,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}
