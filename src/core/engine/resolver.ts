import {
  Card,
  GameState,
  PlayerRoundScore,
  TeamRoundScore,
  RoundResolution,
} from '../models/types';
import { RummyValidator } from './validator';
import { TeamHandOptimizer } from './solver';

export class RoundResolver {
  /**
   * Resolves a round after a player declares Gin or completes a 1,000-point run with their finish card.
   *
   * @param gameState Current game state
   * @param declaringPlayerId The player declaring Gin
   * @param declaredMelds The melds submitted by the declaring player (for standard Gin)
   * @param finishCard The 11th slammed card placed in the finish slot
   */
  static resolveRound(
    gameState: GameState,
    declaringPlayerId: string,
    declaredMelds: Card[][],
    finishCard: Card | null
  ): RoundResolution {
    const declaringPlayer = gameState.players.find(p => p.id === declaringPlayerId);
    if (!declaringPlayer) throw new Error(`Declaring player ${declaringPlayerId} not found`);

    const isTeamMode = gameState.rules.mode === 'TEAM_4P';
    const numPlayers = gameState.players.length;

    // 1. Verify 1,000-Point Run or Standard Gin
    // For individual hand 1000-point run check, hand must have 10 cards
    const flatDeclaredCards = declaredMelds.flat();
    const isThousandRun = declaredMelds.length === 1 && 
      RummyValidator.checkThousandPointRun(flatDeclaredCards);

    const isStandardGin = !isThousandRun && RummyValidator.validateGin(declaredMelds);

    if (!isThousandRun && !isStandardGin) {
      throw new Error('Invalid declaration: Hand is neither a valid 4+3+3 Gin nor a 1,000-point run.');
    }

    // Upstream feeder seat for the winner: (winnerSeat - 1 + numPlayers) % numPlayers
    const feederSeatIndex = (declaringPlayer.seatIndex - 1 + numPlayers) % numPlayers;
    const feederPlayer = gameState.players.find(p => p.seatIndex === feederSeatIndex);

    // Consecutive Gins calculation
    const newConsecutiveGins = declaringPlayer.consecutiveGins + 1;
    const isThreeConsecutiveGins = newConsecutiveGins >= 3;

    if (isTeamMode) {
      return this.resolveTeamRound(
        gameState,
        declaringPlayer,
        declaredMelds,
        finishCard,
        isThousandRun,
        isThreeConsecutiveGins,
        feederPlayer?.id || null
      );
    } else {
      return this.resolveSoloRound(
        gameState,
        declaringPlayer,
        declaredMelds,
        finishCard,
        isThousandRun,
        isThreeConsecutiveGins,
        feederPlayer?.id || null
      );
    }
  }

  /**
   * Resolve Solo Modes (2-Player or 4-Player Cutthroat)
   */
  private static resolveSoloRound(
    gameState: GameState,
    declaringPlayer: GameState['players'][0],
    declaredMelds: Card[][],
    finishCard: Card | null,
    isThousandRun: boolean,
    isThreeConsecutiveGins: boolean,
    feederPlayerId: string | null
  ): RoundResolution {
    const playerScores: PlayerRoundScore[] = [];

    for (const player of gameState.players) {
      const isWinner = player.id === declaringPlayer.id;

      if (isWinner) {
        let meldScore = 0;
        let ginBonus = 0;
        let specialBonus = 0;

        if (isThousandRun) {
          specialBonus = 1000;
          meldScore = RummyValidator.sumPoints(declaredMelds.flat());
        } else {
          meldScore = RummyValidator.sumPoints(declaredMelds.flat());
          ginBonus = 100;
        }

        const netRoundScore = isThousandRun ? 1000 : meldScore + ginBonus;

        playerScores.push({
          playerId: player.id,
          name: player.name,
          seatIndex: player.seatIndex,
          teamId: player.teamId,
          melds: declaredMelds,
          deadwood: [],
          isWinner: true,
          hasGin: !isThousandRun,
          hasThousandPointRun: isThousandRun,
          hasZeroMelds: false,
          meldScore,
          deadwoodDebt: 0,
          ginBonus,
          specialBonus,
          zeroMeldPenalty: 0,
          consecutiveGinPenalty: 0,
          netRoundScore,
          previousCumulativeScore: player.cumulativeScore,
          newCumulativeScore: player.cumulativeScore + netRoundScore,
        });
      } else {
        // Loser: optimize individual 10-card hand for best melds vs deadwood
        const optimization = TeamHandOptimizer.optimizeMergedHand(player.hand);
        const hasZeroMelds = optimization.melds.length === 0;

        let zeroMeldPenalty = 0;
        let deadwoodDebt = 0;
        let meldScore = 0;
        let netRoundScore = 0;
        let consecutiveGinPenalty = 0;

        // Check feeder penalty (if winner has 3 consecutive Gins, feeder forfeits round points and gets -100)
        const isFeeder = isThreeConsecutiveGins && player.id === feederPlayerId;

        if (isFeeder) {
          consecutiveGinPenalty = -100;
          netRoundScore = -100;
        } else if (hasZeroMelds) {
          // Zero-meld penalty: -100 points, deadwood debt ignored
          zeroMeldPenalty = -100;
          netRoundScore = -100;
        } else {
          meldScore = optimization.meldScore;
          deadwoodDebt = -optimization.debtScore;
          netRoundScore = optimization.netScore;
        }

        playerScores.push({
          playerId: player.id,
          name: player.name,
          seatIndex: player.seatIndex,
          teamId: player.teamId,
          melds: optimization.melds,
          deadwood: optimization.deadwood,
          isWinner: false,
          hasGin: false,
          hasThousandPointRun: false,
          hasZeroMelds,
          meldScore,
          deadwoodDebt,
          ginBonus: 0,
          specialBonus: 0,
          zeroMeldPenalty,
          consecutiveGinPenalty,
          netRoundScore,
          previousCumulativeScore: player.cumulativeScore,
          newCumulativeScore: player.cumulativeScore + netRoundScore,
        });
      }
    }

    // Check match over
    const matchWinner = playerScores.find(
      p => p.newCumulativeScore >= gameState.rules.targetScore
    );

    return {
      winnerPlayerId: declaringPlayer.id,
      winningTeamId: null,
      isThousandPointRun: isThousandRun,
      finishCard,
      playerScores,
      matchOver: !!matchWinner,
      matchWinnerId: matchWinner?.playerId,
    };
  }

  /**
   * Resolve 4-Player Team Mode (2v2)
   * Teammates combine cards (10 + 10 = 20 cards) and optimize melds.
   */
  private static resolveTeamRound(
    gameState: GameState,
    declaringPlayer: GameState['players'][0],
    _declaredMelds: Card[][],
    finishCard: Card | null,
    isThousandRun: boolean,
    isThreeConsecutiveGins: boolean,
    feederPlayerId: string | null
  ): RoundResolution {
    const winningTeamId = declaringPlayer.teamId as 'TEAM_A' | 'TEAM_B';
    const losingTeamId: 'TEAM_A' | 'TEAM_B' = winningTeamId === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';

    const winningTeamPlayers = gameState.players.filter(p => p.teamId === winningTeamId);
    const losingTeamPlayers = gameState.players.filter(p => p.teamId === losingTeamId);

    // Combine 20 cards for each team
    const winningTeamCards = winningTeamPlayers.flatMap(p => p.hand);
    const losingTeamCards = losingTeamPlayers.flatMap(p => p.hand);

    // Optimize winning team cards (or if declaring player alone formed 4+3+3, we also optimize partner's cards)
    const winOptimization = TeamHandOptimizer.optimizeMergedHand(winningTeamCards);
    const loseOptimization = TeamHandOptimizer.optimizeMergedHand(losingTeamCards);

    // Winning Team score
    let winMeldScore = winOptimization.meldScore;
    let winDebtScore = winOptimization.debtScore;
    let winGinBonus = 100;
    let winSpecialBonus = 0;
    let winNetScore = 0;

    if (isThousandRun) {
      winSpecialBonus = 1000;
      winGinBonus = 0;
      winNetScore = 1000;
    } else {
      winNetScore = winOptimization.netScore + winGinBonus;
    }

    // Losing Team score
    const loseHasZeroMelds = loseOptimization.melds.length === 0;
    let loseZeroMeldPenalty = 0;
    let loseConsecutiveGinPenalty = 0;
    let loseNetScore = 0;

    if (isThreeConsecutiveGins) {
      // Upstream feeder seat forfeits round points and gets -100 penalty
      loseConsecutiveGinPenalty = -100;
      loseNetScore = -100;
    } else if (loseHasZeroMelds) {
      // Flat -100 point penalty, deadwood debt ignored
      loseZeroMeldPenalty = -100;
      loseNetScore = -100;
    } else {
      loseNetScore = loseOptimization.netScore;
    }

    // Split team scores equally between teammates
    const winPlayerShare = Math.round(winNetScore / 2);
    const losePlayerShare = Math.round(loseNetScore / 2);

    const playerScores: PlayerRoundScore[] = gameState.players.map(p => {
      const isWinner = p.teamId === winningTeamId;
      const isFeeder = isThreeConsecutiveGins && p.id === feederPlayerId;

      if (isWinner) {
        return {
          playerId: p.id,
          name: p.name,
          seatIndex: p.seatIndex,
          teamId: p.teamId,
          melds: winOptimization.melds,
          deadwood: winOptimization.deadwood,
          isWinner: true,
          hasGin: !isThousandRun,
          hasThousandPointRun: isThousandRun && p.id === declaringPlayer.id,
          hasZeroMelds: false,
          meldScore: Math.round(winMeldScore / 2),
          deadwoodDebt: -Math.round(winDebtScore / 2),
          ginBonus: Math.round(winGinBonus / 2),
          specialBonus: Math.round(winSpecialBonus / 2),
          zeroMeldPenalty: 0,
          consecutiveGinPenalty: 0,
          netRoundScore: winPlayerShare,
          previousCumulativeScore: p.cumulativeScore,
          newCumulativeScore: p.cumulativeScore + winPlayerShare,
        };
      } else {
        return {
          playerId: p.id,
          name: p.name,
          seatIndex: p.seatIndex,
          teamId: p.teamId,
          melds: loseOptimization.melds,
          deadwood: loseOptimization.deadwood,
          isWinner: false,
          hasGin: false,
          hasThousandPointRun: false,
          hasZeroMelds: loseHasZeroMelds,
          meldScore: loseHasZeroMelds ? 0 : Math.round(loseOptimization.meldScore / 2),
          deadwoodDebt: loseHasZeroMelds ? 0 : -Math.round(loseOptimization.debtScore / 2),
          ginBonus: 0,
          specialBonus: 0,
          zeroMeldPenalty: loseZeroMeldPenalty ? Math.round(loseZeroMeldPenalty / 2) : 0,
          consecutiveGinPenalty: isFeeder ? -100 : 0,
          netRoundScore: isFeeder ? -100 : losePlayerShare,
          previousCumulativeScore: p.cumulativeScore,
          newCumulativeScore: p.cumulativeScore + (isFeeder ? -100 : losePlayerShare),
        };
      }
    });

    const teamScores: TeamRoundScore[] = [
      {
        teamId: winningTeamId,
        playerIds: winningTeamPlayers.map(p => p.id),
        melds: winOptimization.melds,
        deadwood: winOptimization.deadwood,
        isWinner: true,
        hasGin: !isThousandRun,
        hasZeroMelds: false,
        meldScore: winMeldScore,
        debtScore: winDebtScore,
        ginBonus: winGinBonus,
        zeroMeldPenalty: 0,
        netRoundScore: winNetScore,
        previousCumulativeScore: winningTeamPlayers.reduce((sum, p) => sum + p.cumulativeScore, 0),
        newCumulativeScore: winningTeamPlayers.reduce((sum, p) => sum + p.cumulativeScore, 0) + winNetScore,
      },
      {
        teamId: losingTeamId,
        playerIds: losingTeamPlayers.map(p => p.id),
        melds: loseOptimization.melds,
        deadwood: loseOptimization.deadwood,
        isWinner: false,
        hasGin: false,
        hasZeroMelds: loseHasZeroMelds,
        meldScore: loseOptimization.meldScore,
        debtScore: loseOptimization.debtScore,
        ginBonus: 0,
        zeroMeldPenalty: loseZeroMeldPenalty,
        consecutiveGinPenalty: loseConsecutiveGinPenalty,
        netRoundScore: loseNetScore,
        previousCumulativeScore: losingTeamPlayers.reduce((sum, p) => sum + p.cumulativeScore, 0),
        newCumulativeScore: losingTeamPlayers.reduce((sum, p) => sum + p.cumulativeScore, 0) + loseNetScore,
      },
    ];

    // Check match over
    const winningTeamTotal = teamScores.find(t => t.teamId === winningTeamId)?.newCumulativeScore ?? 0;
    const matchOver = winningTeamTotal >= gameState.rules.targetScore;

    return {
      winnerPlayerId: declaringPlayer.id,
      winningTeamId,
      isThousandPointRun: isThousandRun,
      finishCard,
      playerScores,
      teamScores,
      matchOver,
      matchWinnerId: matchOver ? winningTeamId : undefined,
    };
  }
}
