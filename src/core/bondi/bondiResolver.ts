import { Card } from '../models/types';
import { BondiPlayer, BondiTrick } from './bondiTypes';
import { BondiValidator } from './bondiValidator';
import { DeckService } from '../deck/deck';

export class BondiResolver {
  /**
   * Distribute 52 cards across 2 to 6 players anti-clockwise.
   */
  static dealCards(playerCount: number): Card[][] {
    const deck = DeckService.shuffle(DeckService.createStandardDeck());
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);

    // Distribute 1 by 1 anti-clockwise
    let p = 0;
    for (const card of deck) {
      card.isFaceDown = false;
      hands[p].push(card);
      p = (p + 1) % playerCount;
    }
    return hands;
  }

  /**
   * Locate the player holding the Ace of Spades (Opening lead of Hand 1).
   */
  static findAceOfSpadesHolder(players: BondiPlayer[]): number {
    for (const player of players) {
      if (player.hand.some(c => c.suit === 'SPADES' && c.rank === 1)) {
        return player.seatIndex;
      }
    }
    return 0;
  }

  /**
   * Calculate next active player seat, rotating anti-clockwise and skipping exited players.
   */
  static getNextActiveSeat(currentSeat: number, players: BondiPlayer[]): number {
    const total = players.length;
    let next = (currentSeat + 1) % total;
    let loopCount = 0;
    while (players[next].hasExited && loopCount < total) {
      next = (next + 1) % total;
      loopCount++;
    }
    return next;
  }

  /**
   * Count how many players are still in play (have not yet shed all cards).
   */
  static getActivePlayerCount(players: BondiPlayer[]): number {
    return players.filter(p => !p.hasExited).length;
  }

  /**
   * Update the at-risk tracking for the highest card of the led suit.
   */
  static updateAtRisk(trick: BondiTrick, playedCard: Card, seatIndex: number): void {
    if (!trick.leadSuit) {
      trick.leadSuit = playedCard.suit;
      trick.atRiskSeat = seatIndex;
      trick.atRiskCard = playedCard;
      return;
    }

    if (playedCard.suit === trick.leadSuit) {
      if (
        !trick.atRiskCard ||
        BondiValidator.getCardStrength(playedCard) >
          BondiValidator.getCardStrength(trick.atRiskCard)
      ) {
        trick.atRiskSeat = seatIndex;
        trick.atRiskCard = playedCard;
      }
    }
  }

  /**
   * Check if any player has cleared their hand and mark exit.
   */
  static checkPlayerExits(players: BondiPlayer[]): void {
    const exitedCount = players.filter(p => p.hasExited).length;
    let nextRank = exitedCount + 1;
    for (const player of players) {
      if (!player.hasExited && player.hand.length === 0) {
        player.hasExited = true;
        player.exitRank = nextRank;
        nextRank++;
      }
    }
  }

  /**
   * Check if match is complete (only 1 player remaining).
   */
  static isMatchOver(players: BondiPlayer[]): boolean {
    return this.getActivePlayerCount(players) <= 1;
  }

  /**
   * Get the designated loser ("The Bondi").
   */
  static getLoserSeat(players: BondiPlayer[]): number | null {
    const active = players.filter(p => !p.hasExited);
    return active.length === 1 ? active[0].seatIndex : null;
  }
}
