import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RoundResolution } from '../../core/models/types';
import { ChevronRight, RotateCcw, Coins, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import { JuicyButton } from './JuicyButton';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface RoundScoreModalProps {
  resolution: RoundResolution;
  onNextRound: () => void;
  onResetMatch: () => void;
}

export const RoundScoreModal: React.FC<RoundScoreModalProps> = ({
  resolution,
  onNextRound,
  onResetMatch,
}) => {
  const recordMatchResult = useAuthStore(state => state.recordMatchResult);
  const tablePot = useGameStore(state => state.tablePot) || 4000;
  const pendingRules = useGameStore(state => state.pendingRules);
  const hasRecordedRef = useRef(false);

  // 3-Beat Pacing Animation States: 0 = start, 1 = melds, 2 = debt, 3 = gin bonus + total
  const [beatStage, setBeatStage] = useState<number>(0);

  const startBeatSequence = useCallback(() => {
    setBeatStage(0);
    const t1 = setTimeout(() => {
      setBeatStage(1);
      try { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); } catch {}
    }, 350);

    const t2 = setTimeout(() => {
      setBeatStage(2);
      try { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); } catch {}
    }, 850);

    const t3 = setTimeout(() => {
      setBeatStage(3);
      try { Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}); } catch {}
    }, 1350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    const cleanup = startBeatSequence();
    return cleanup;
  }, [startBeatSequence]);

  // Pot distribution calculations (with 5% house rake)
  const houseRake = Math.round(tablePot * 0.05);
  const netPot = tablePot - houseRake;
  const matchWinShare = pendingRules?.mode === 'TEAM_4P' ? Math.round(netPot / 2) : netPot;

  useEffect(() => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;

    try {
      // Check if Human (Player 0 / Seat 0) won or was in the winning team (TEAM_A)
      const humanWon =
        resolution.winnerPlayerId === 'player-0' ||
        resolution.winnerPlayerId === 'player-1' ||
        resolution.winnerPlayerId === 'You (South)' ||
        resolution.winnerPlayerId === 'You (Player 1)' ||
        (resolution.winningTeamId === 'TEAM_A');

      const playerScores = resolution.playerScores || [];
      const humanScore = playerScores.find(p => p.seatIndex === 0);

      let coinsWon = 0;
      if (humanWon) {
        coinsWon = resolution.matchOver ? matchWinShare : 250;
      } else {
        coinsWon = 50; // Consolation chips
      }

      recordMatchResult({
        isWin: humanWon,
        isGin: humanScore?.hasGin ?? false,
        isThousandRun: humanScore?.hasThousandPointRun ?? false,
        points: humanScore?.netRoundScore ?? 0,
        coinsWon,
        referenceId: pendingRules?.roomCode,
      });
    } catch (e) {
      console.warn('Error recording match result:', e);
    }
  }, [resolution, recordMatchResult, matchWinShare, pendingRules?.roomCode]);

  const humanWon =
    resolution.winnerPlayerId === 'player-0' ||
    resolution.winnerPlayerId === 'player-1' ||
    resolution.winnerPlayerId === 'You (South)' ||
    resolution.winnerPlayerId === 'You (Player 1)' ||
    (resolution.winningTeamId === 'TEAM_A');

  const winnerPlayer = (resolution.playerScores || []).find(
    p => p.playerId === resolution.winnerPlayerId
  );
  const winnerTitle = resolution.winningTeamId
    ? `${resolution.winningTeamId === 'TEAM_A' ? 'TEAM A (YOU)' : 'TEAM B (OPPONENTS)'} WINS THE ROUND!`
    : `${winnerPlayer?.name || resolution.winnerPlayerId || 'WINNER'} WINS THE ROUND!`;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto overscroll-contain">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative bg-gradient-to-b from-[#170b09] via-[#0d0605] to-[#0d0605] border-2 border-[#301a14] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 max-w-xl sm:max-w-2xl w-full shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(200,75,49,0.2)] flex flex-col gap-2.5 sm:gap-3.5 max-h-[94dvh] sm:max-h-[90dvh] overflow-y-auto overscroll-contain text-[#f7f0ea] my-auto"
      >
        {/* Compact Theatrical Modal Header */}
        <div className="flex items-center justify-center gap-2.5 border-b border-[#301a14] pb-2 sm:pb-3 shrink-0 font-sans-clean">
          <motion.div
            animate={beatStage >= 3 ? { scale: [1, 1.18, 1] } : {}}
            transition={{ duration: 0.35 }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] flex items-center justify-center text-base sm:text-lg shadow-[0_0_15px_rgba(229,195,120,0.5)] border border-[#e5c378] shrink-0"
          >
            🏆
          </motion.div>
          <div className="text-left sm:text-center">
            <h2 className="text-sm sm:text-lg font-serif font-black text-[#f7f0ea] tracking-tight leading-tight">
              {winnerTitle}
            </h2>
            {resolution.isThousandPointRun && (
              <p className="text-[10px] sm:text-xs font-black text-[#e5c378] animate-pulse font-mono">
                ★ 1,000-POINT SUITED RUN BONUS ACHIEVED ★
              </p>
            )}
          </div>
        </div>

        {/* High-Stakes Championship Pot Payout Banner */}
        {resolution.matchOver && (
          <div className="bg-[#170b09] border border-[#e5c378]/50 rounded-xl p-2 text-center flex items-center justify-between px-3 sm:px-4 shadow-md shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#e5c378] flex items-center gap-1.5 font-sans-clean">
              <Coins className="w-3.5 h-3.5 text-[#e5c378]" />
              <span>{humanWon ? '🏆 Match Championship Payout' : 'Table Pot Settled'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-[#e5c378] font-mono">
                {humanWon ? `+${matchWinShare.toLocaleString()} Coins` : `${tablePot.toLocaleString()} Total Pot`}
              </span>
              <span className="text-[9px] text-[#f7f0ea]/50 font-semibold font-mono hidden sm:inline">
                (−5% House Rake)
              </span>
            </div>
          </div>
        )}

        {/* 3-Beat Theatrical Score Breakdown (Team Scores or Solo) */}
        {resolution.teamScores ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 font-sans-clean shrink-0">
            {resolution.teamScores.map(t => {
              const isWinTeam = t.isWinner;
              const isTeamA = t.teamId === 'TEAM_A';
              return (
                <div
                  key={t.teamId}
                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border shadow-md transition-all ${
                    isWinTeam
                      ? 'bg-[#170b09] border-[#e5c378]/60 shadow-[0_0_20px_rgba(229,195,120,0.18)]'
                      : 'bg-[#0d0605] border-[#301a14]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`font-black text-xs sm:text-sm tracking-wide ${isWinTeam ? 'text-[#e5c378]' : 'text-[#f7f0ea]/70'}`}>
                      {isTeamA ? 'TEAM A (You)' : 'TEAM B (Opponents)'}
                    </span>
                    <span className="font-mono text-[11px] sm:text-xs font-black text-[#f7f0ea]/70">
                      Total: <span className="text-[#f7f0ea] font-bold">{t.newCumulativeScore ?? 0}p</span>
                    </span>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs font-mono">
                    {/* Beat 1: Melds */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e5c378]" />
                        <span>Melds:</span>
                      </span>
                      <span className="font-black text-[#e5c378]">
                        {beatStage >= 1 ? `+${t.meldScore ?? 0}p` : '...'}
                      </span>
                    </div>

                    {/* Beat 2: Debt */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Debt:</span>
                      </span>
                      <span className="font-black text-rose-300">
                        {beatStage >= 2 ? (t.debtScore === 0 ? '0p (Clean)' : `-${t.debtScore ?? 0}p`) : '...'}
                      </span>
                    </div>

                    {/* Beat 3: Gin Bonus */}
                    {(t.ginBonus ?? 0) > 0 && (
                      <div className="flex justify-between items-center bg-[#e5c378]/10 px-1.5 py-0.5 rounded border border-[#e5c378]/30">
                        <span className="text-[#e5c378] font-black flex items-center gap-1 font-sans-clean text-[10px] sm:text-[11px]">
                          <span>★</span>
                          <span>Gin Bonus:</span>
                        </span>
                        <span className="font-black text-[#e5c378]">
                          {beatStage >= 3 ? `+${t.ginBonus}p` : '...'}
                        </span>
                      </div>
                    )}

                    {/* Net Round Total */}
                    <div className="flex justify-between items-center border-t border-[#301a14] pt-1 font-bold font-sans-clean">
                      <span className="text-[#f7f0ea]/80 text-[11px] sm:text-xs">Net Round:</span>
                      <span
                        className={`text-sm sm:text-base font-mono font-black ${
                          (t.netRoundScore ?? 0) >= 0 ? 'text-[#e5c378]' : 'text-rose-400'
                        }`}
                      >
                        {beatStage >= 3
                          ? `${(t.netRoundScore ?? 0) > 0 ? `+${t.netRoundScore}` : t.netRoundScore}p`
                          : '...'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Solo Player Standings */
          <div className="bg-[#0d0605] rounded-2xl p-3 border border-[#301a14] shadow-md shrink-0">
            <h4 className="text-[10px] uppercase font-black text-[#e5c378]/70 mb-2 tracking-wider font-mono">
              STANDINGS & NET ROUND SCORE
            </h4>
            <div className="space-y-1 font-mono text-xs">
              {(resolution.playerScores || []).map(p => (
                <div
                  key={p.playerId}
                  className="flex justify-between items-center bg-[#170b09] px-3 py-1.5 rounded-xl border border-[#301a14]"
                >
                  <span className="font-bold text-[#f7f0ea] font-sans-clean">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-black ${
                        (p.netRoundScore ?? 0) >= 0 ? 'text-[#e5c378]' : 'text-rose-400'
                      }`}
                    >
                      {beatStage >= 3
                        ? `${(p.netRoundScore ?? 0) > 0 ? `+${p.netRoundScore}` : p.netRoundScore}p`
                        : '...'}
                    </span>
                    <span className="text-[#f7f0ea] font-black w-14 text-right">
                      {p.newCumulativeScore ?? 0}p
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Action Controls (Always Visible Sticky Footer) */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 sm:pt-2 border-t border-[#301a14] shrink-0">
          <button
            onClick={startBeatSequence}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase bg-[#170b09] text-[#e5c378] border border-[#301a14] flex items-center gap-1.5 cursor-pointer hover:bg-[#301a14] transition font-sans-clean shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#e5c378]" />
            <span>Replay Tally</span>
          </button>

          {resolution.matchOver ? (
            <JuicyButton variant="gold" size="md" onClick={onResetMatch} className="shadow-lg">
              <RotateCcw className="w-4 h-4 mr-1" />
              <span>New Match</span>
            </JuicyButton>
          ) : (
            <JuicyButton variant="gold" size="md" onClick={onNextRound} className="shadow-[0_0_20px_rgba(229,195,120,0.4)]">
              <span>Next Round</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </JuicyButton>
          )}
        </div>
      </motion.div>
    </div>
  );
};
