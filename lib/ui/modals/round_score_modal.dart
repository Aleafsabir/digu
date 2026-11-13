import 'package:flutter/material.dart';
import '../../core/models/card_models.dart';
import '../../game/rendering/card_painter.dart';
import '../../game/table_canvas.dart' show HolhuashiGameMode, RoundOverData;

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
  final HolhuashiGameMode mode;
  final String? summaryHeadline;
  final int team1Tens;
  final int team2Tens;
  final int team1Tricks;
  final int team2Tricks;
  final List<PlayingCard> burnedCards;
  final int humanRoundScore;
  final int opponentRoundScore;
  final VoidCallback onNextRound;
  final VoidCallback? onReturnToLobby;

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
    this.mode = HolhuashiGameMode.digu,
    this.summaryHeadline,
    this.team1Tens = 0,
    this.team2Tens = 0,
    this.team1Tricks = 0,
    this.team2Tricks = 0,
    this.burnedCards = const [],
    this.humanRoundScore = 0,
    this.opponentRoundScore = 0,
    required this.onNextRound,
    this.onReturnToLobby,
  });

  factory RoundScoreModal.fromRoundData({
    Key? key,
    required RoundOverData data,
    required int humanCumulativeScore,
    required int botCumulativeScore,
    required VoidCallback onNextRound,
    VoidCallback? onReturnToLobby,
    int? humanRoundScore,
    int? opponentRoundScore,
  }) {
    return RoundScoreModal(
      key: key,
      humanWon: data.humanWon,
      winnerName: data.winnerName,
      winningMelds: data.winningMelds,
      deadwood: data.deadwood,
      meldScore: data.meldScore,
      debtScore: data.debtScore,
      ginBonus: data.ginBonus,
      netRoundScore: data.netRoundScore,
      humanCumulativeScore: humanCumulativeScore,
      botCumulativeScore: botCumulativeScore,
      mode: data.mode,
      summaryHeadline: data.summaryHeadline,
      team1Tens: data.team1Tens,
      team2Tens: data.team2Tens,
      team1Tricks: data.team1Tricks,
      team2Tricks: data.team2Tricks,
      burnedCards: data.burnedCards,
      humanRoundScore: humanRoundScore ?? data.humanRoundScore,
      opponentRoundScore: opponentRoundScore ?? data.opponentRoundScore,
      onNextRound: onNextRound,
      onReturnToLobby: onReturnToLobby,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 700, maxHeight: 520),
        decoration: BoxDecoration(
          color: const Color(0xF9150706),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD4AF37), width: 2),
          boxShadow: [
            BoxShadow(
              color: (humanWon ? const Color(0xFFD4AF37) : const Color(0xFFC84B31))
                  .withValues(alpha: 0.35),
              blurRadius: 32,
              spreadRadius: 4,
            ),
          ],
        ),
        padding: const EdgeInsets.all(22),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    summaryHeadline ??
                        (humanWon
                            ? (mode == HolhuashiGameMode.dhihaeh
                                ? '🏆 HAASBAGGA VICTORY! 🏆'
                                : mode == HolhuashiGameMode.bondi
                                    ? '🏆 BONDI OUT-SHED VICTORY! 🏆'
                                    : '⚡ GIN VICTORY! ⚡')
                            : 'ROUND FINISHED'),
                    style: TextStyle(
                      color: humanWon ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.4,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '$winnerName has claimed this round!',
                style: const TextStyle(
                  color: Color(0xB3F7F0EA),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 14),

              // Mode-Specific Breakdown Content
              if (mode == HolhuashiGameMode.digu)
                _buildDiguBreakdown()
              else if (mode == HolhuashiGameMode.dhihaeh)
                _buildDhihaehBreakdown()
              else
                _buildBondiBreakdown(),

              const SizedBox(height: 14),

              // Cumulative Match Score Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D0405),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF380C10)),
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
                      'OPPONENT: $botCumulativeScore pts',
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
              const SizedBox(height: 18),

              // Action Buttons: Return to Lobby + Continue to Next Round
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (onReturnToLobby != null) ...[
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFD4AF37), width: 1.2),
                        foregroundColor: const Color(0xFFE5C378),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: onReturnToLobby,
                      child: const Text(
                        '← RETURN TO LOBBY',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                  ],
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE5C378),
                      foregroundColor: const Color(0xFF0D0605),
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 6,
                    ),
                    onPressed: onNextRound,
                    child: const Text(
                      'DEAL NEXT ROUND ➜',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDiguBreakdown() {
    return Column(
      children: [
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
                            // Always force cards in winningMelds to render face-up
                            painter: CardPainter(card: card.copyWith(isFaceDown: false)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Score Card Breakdown Table
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0D0605),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF380C10)),
          ),
          child: Column(
            children: [
              if (humanRoundScore > 0 || opponentRoundScore > 0) ...[
                _buildScoreRow('Your Meld Points', '+$humanRoundScore pts', const Color(0xFFE5C378)),
                _buildScoreRow('Opponent Round Points', '+$opponentRoundScore pts', const Color(0xFFFFA07A)),
              ],
              _buildScoreRow('Meld Points', '+$meldScore pts', const Color(0xFFE5C378)),
              if (ginBonus > 0)
                _buildScoreRow('Gin Bonus', '+$ginBonus pts', const Color(0xFF00E5FF)),
              if (debtScore > 0)
                _buildScoreRow('Deadwood Debt', '-$debtScore pts', const Color(0xFFC84B31)),
              const Divider(color: Color(0xFF380C10), height: 14),
              _buildScoreRow(
                'Net Round Score',
                '${netRoundScore > 0 ? '+' : ''}$netRoundScore pts',
                humanWon ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
                isBold: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDhihaehBreakdown() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0605),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: Column(
        children: [
          _buildScoreRow('Team A (South + North) Captured 10s', '$team1Tens / 4', const Color(0xFFE5C378)),
          _buildScoreRow('Team B (East + West) Captured 10s', '$team2Tens / 4', const Color(0xFFFFA07A)),
          _buildScoreRow('Team A Tricks Won', '$team1Tricks tricks', const Color(0xFFE5C378)),
          _buildScoreRow('Team B Tricks Won', '$team2Tricks tricks', const Color(0xFFFFA07A)),
          const Divider(color: Color(0xFF380C10), height: 14),
          _buildScoreRow(
            'Round Outcome',
            team1Tens == 4
                ? 'HAASBAGGA (+1,000 pts)'
                : team2Tens == 4
                    ? 'HAASBAGGA (Team B +1,000 pts)'
                    : team1Tens > team2Tens
                        ? 'BAGGA (+4 pts)'
                        : 'BAGGA (Team B +4 pts)',
            humanWon ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
            isBold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildBondiBreakdown() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0605),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: Column(
        children: [
          _buildScoreRow('Player (South) Tricks Won', '$team1Tricks tricks', const Color(0xFFE5C378)),
          _buildScoreRow('Opponents Total Tricks Won', '$team2Tricks tricks', const Color(0xFFFFA07A)),
          if (burnedCards.isNotEmpty)
            _buildScoreRow('Burn Pile Pickups', '${burnedCards.length} cards burned', const Color(0xFFC84B31)),
          const Divider(color: Color(0xFF380C10), height: 14),
          _buildScoreRow(
            'Bondi Round Delta',
            '${netRoundScore > 0 ? '+' : ''}$netRoundScore pts',
            humanWon ? const Color(0xFFE5C378) : const Color(0xFFF7F0EA),
            isBold: true,
          ),
        ],
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
