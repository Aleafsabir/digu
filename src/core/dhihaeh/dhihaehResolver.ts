import { Suit } from '../models/types';
import { DhihaehPlayer, DhihaehTrick } from './dhihaehTypes';
import { DhihaehValidator } from './dhihaehValidator';

export class DhihaehResolver {
  /**
   * Determine the winner seat of an active trick.
   * Priority:
   * 1. If trump suit is active and trump cards were played, highest trump wins.
   * 2. Otherwise, highest card of the led suit wins.
   */
  static evaluateTrickWinner(trick: DhihaehTrick, trumpSuit: Suit | null): number {
    if (trick.cards.length === 0) return 0;
    const leadSuit = trick.leadSuit || trick.cards[0].card.suit;

    // Filter trump plays
    const trumpCards = trumpSuit
      ? trick.cards.filter(c => c.card.suit === trumpSuit)
      : [];

    if (trumpCards.length > 0) {
      let highestTrump = trumpCards[0];
      for (let i = 1; i < trumpCards.length; i++) {
        if (
          DhihaehValidator.getCardStrength(trumpCards[i].card) >
          DhihaehValidator.getCardStrength(highestTrump.card)
        ) {
          highestTrump = trumpCards[i];
        }
      }
      return highestTrump.playedBySeat;
    }

    // No trumps played: highest of the led suit
    const ledCards = trick.cards.filter(c => c.card.suit === leadSuit);
    let highestLed = ledCards[0] || trick.cards[0];
    for (let i = 1; i < ledCards.length; i++) {
      if (
        DhihaehValidator.getCardStrength(ledCards[i].card) >
        DhihaehValidator.getCardStrength(highestLed.card)
      ) {
        highestLed = ledCards[i];
      }
    }
    return highestLed.playedBySeat;
  }

  /**
   * Evaluates the completed hand (all 13 tricks played) and computes scores.
   */
  static evaluateHandScores(players: DhihaehPlayer[]): {
    outcomeType: 'HAASBAGGA' | 'BAGGA' | 'STANDARD' | 'TIE_BREAKER';
    handWinnerTeam: 'TEAM_1' | 'TEAM_2';
    team1PointsEarned: number;
    team2PointsEarned: number;
    team1Tens: number;
    team2Tens: number;
    team1Tricks: number;
    team2Tricks: number;
  } {
    const team1Players = players.filter(p => p.teamId === 'TEAM_1');
    const team2Players = players.filter(p => p.teamId === 'TEAM_2');

    const team1Tens = team1Players.reduce((sum, p) => sum + p.capturedTens.length, 0);
    const team2Tens = team2Players.reduce((sum, p) => sum + p.capturedTens.length, 0);

    const team1Tricks = team1Players.reduce((sum, p) => sum + p.tricksWon, 0);
    const team2Tricks = team2Players.reduce((sum, p) => sum + p.tricksWon, 0);

    // Case 1: Haasbagga (all four 10s and all 13 tricks)
    if (team1Tens === 4 && team1Tricks === 13) {
      return {
        outcomeType: 'HAASBAGGA',
        handWinnerTeam: 'TEAM_1',
        team1PointsEarned: 1000,
        team2PointsEarned: 0,
        team1Tens,
        team2Tens,
        team1Tricks,
        team2Tricks,
      };
    }
    if (team2Tens === 4 && team2Tricks === 13) {
      return {
        outcomeType: 'HAASBAGGA',
        handWinnerTeam: 'TEAM_2',
        team1PointsEarned: 0,
        team2PointsEarned: 1000,
        team1Tens,
        team2Tens,
        team1Tricks,
        team2Tricks,
      };
    }

    // Case 2: Bagga (all four 10s, but < 13 tricks)
    if (team1Tens === 4) {
      return {
        outcomeType: 'BAGGA',
        handWinnerTeam: 'TEAM_1',
        team1PointsEarned: 4,
        team2PointsEarned: 0,
        team1Tens,
        team2Tens,
        team1Tricks,
        team2Tricks,
      };
    }
    if (team2Tens === 4) {
      return {
        outcomeType: 'BAGGA',
        handWinnerTeam: 'TEAM_2',
        team1PointsEarned: 0,
        team2PointsEarned: 4,
        team1Tens,
        team2Tens,
        team1Tricks,
        team2Tricks,
      };
    }

    // Case 3: Standard 3-1 split (1 point to majority team)
    if (team1Tens === 3) {
      return {
        outcomeType: 'STANDARD',
        handWinnerTeam: 'TEAM_1',
        team1PointsEarned: 1,
        team2PointsEarned: 0,
        team1Tens,
        team2Tens,
        team1Tricks,
        team2Tricks,
      };
    }
    if (team2Tens === 3) {
      return {
        outcomeType: 'STANDARD',
        handWinnerTeam: 'TEAM_2',
        team1PointsEarned: 0,
        team2PointsEarned: 1,
        team1Tens,
        team2Tens,
        team1Tricks,
        team2Tricks,
      };
    }

    // Case 4: Tie-breaker (2-2 split, 0 points awarded; majority tricks >= 7 wins hand)
    const tieWinner = team1Tricks >= 7 ? 'TEAM_1' : 'TEAM_2';
    return {
      outcomeType: 'TIE_BREAKER',
      handWinnerTeam: tieWinner,
      team1PointsEarned: 0,
      team2PointsEarned: 0,
      team1Tens,
      team2Tens,
      team1Tricks,
      team2Tricks,
    };
  }
}
