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
        className="relative bg-gradient-to-b from-[#092B1E] via-[#051D14] to-[#02100A] border-2 border-emerald-500/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 max-w-xl sm:max-w-2xl w-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col gap-2.5 sm:gap-3.5 max-h-[94dvh] sm:max-h-[90dvh] overflow-y-auto overscroll-contain text-white my-auto"
      >
        {/* Compact Theatrical Modal Header */}
        <div className="flex items-center justify-center gap-2.5 border-b border-emerald-900/60 pb-2 sm:pb-3 shrink-0 font-sans-clean">
          <motion.div
            animate={beatStage >= 3 ? { scale: [1, 1.18, 1] } : {}}
            transition={{ duration: 0.35 }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-stone-950 flex items-center justify-center text-base sm:text-lg shadow-[0_0_15px_rgba(251,191,36,0.4)] border border-white shrink-0"
          >
            🏆
          </motion.div>
          <div className="text-left sm:text-center">
            <h2 className="text-sm sm:text-lg font-black text-[#F1F5F9] tracking-tight leading-tight">
              {winnerTitle}
            </h2>
            {resolution.isThousandPointRun && (
              <p className="text-[10px] sm:text-xs font-black text-[#05D59A] animate-pulse">
                ★ 1,000-POINT SUITED RUN BONUS ACHIEVED ★
              </p>
            )}
          </div>
        </div>

        {/* High-Stakes Championship Pot Payout Banner */}
        {resolution.matchOver && (
          <div className="bg-emerald-950/70 border border-amber-400/50 rounded-xl p-2 text-center flex items-center justify-between px-3 sm:px-4 shadow-md shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-sans-clean">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{humanWon ? '🏆 Match Championship Payout' : 'Table Pot Settled'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                {humanWon ? `+${matchWinShare.toLocaleString()} Coins` : `${tablePot.toLocaleString()} Total Pot`}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold font-mono hidden sm:inline">
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
                      ? 'bg-emerald-900/35 border-emerald-400/60 shadow-[0_0_20px_rgba(5,213,154,0.18)]'
                      : 'bg-[#031810]/85 border-slate-800/80'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`font-black text-xs sm:text-sm tracking-wide ${isWinTeam ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {isTeamA ? 'TEAM A (You)' : 'TEAM B (Opponents)'}
                    </span>
                    <span className="font-mono text-[11px] sm:text-xs font-black text-slate-300">
                      Total: <span className="text-white font-bold">{t.newCumulativeScore ?? 0}p</span>
                    </span>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs font-mono">
                    {/* Beat 1: Melds */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#05D59A]" />
                        <span>Melds:</span>
                      </span>
                      <span className="font-black text-[#05D59A]">
                        {beatStage >= 1 ? `+${t.meldScore ?? 0}p` : '...'}
                      </span>
                    </div>

                    {/* Beat 2: Debt */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Debt:</span>
                      </span>
                      <span className="font-black text-rose-300">
                        {beatStage >= 2 ? (t.debtScore === 0 ? '0p (Clean)' : `-${t.debtScore ?? 0}p`) : '...'}
                      </span>
                    </div>

                    {/* Beat 3: Gin Bonus */}
                    {(t.ginBonus ?? 0) > 0 && (
                      <div className="flex justify-between items-center bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                        <span className="text-amber-200 font-black flex items-center gap-1 font-sans-clean text-[10px] sm:text-[11px]">
                          <span>★</span>
                          <span>Gin Bonus:</span>
                        </span>
                        <span className="font-black text-amber-300">
                          {beatStage >= 3 ? `+${t.ginBonus}p` : '...'}
                        </span>
                      </div>
                    )}

                    {/* Net Round Total */}
                    <div className="flex justify-between items-center border-t border-emerald-900/60 pt-1 font-bold font-sans-clean">
                      <span className="text-slate-200 text-[11px] sm:text-xs">Net Round:</span>
                      <span
                        className={`text-sm sm:text-base font-mono font-black ${
                          (t.netRoundScore ?? 0) >= 0 ? 'text-[#05D59A]' : 'text-rose-400'
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
          <div className="bg-[#031810]/90 rounded-2xl p-3 border border-emerald-900/50 shadow-md shrink-0">
            <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-wider font-mono">
              STANDINGS & NET ROUND SCORE
            </h4>
            <div className="space-y-1 font-mono text-xs">
              {(resolution.playerScores || []).map(p => (
                <div
                  key={p.playerId}
                  className="flex justify-between items-center bg-[#052216] px-3 py-1.5 rounded-xl border border-emerald-950/80"
                >
                  <span className="font-bold text-slate-100 font-sans-clean">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-black ${
                        (p.netRoundScore ?? 0) >= 0 ? 'text-[#05D59A]' : 'text-rose-400'
                      }`}
                    >
                      {beatStage >= 3
                        ? `${(p.netRoundScore ?? 0) > 0 ? `+${p.netRoundScore}` : p.netRoundScore}p`
                        : '...'}
                    </span>
                    <span className="text-white font-black w-14 text-right">
                      {p.newCumulativeScore ?? 0}p
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Action Controls (Always Visible Sticky Footer) */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 sm:pt-2 border-t border-emerald-950/60 shrink-0">
          <button
            onClick={startBeatSequence}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase bg-[#031B12] text-slate-300 border border-emerald-800/60 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-950 transition font-sans-clean shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Replay Tally</span>
          </button>

          {resolution.matchOver ? (
            <JuicyButton variant="platinum" size="md" onClick={onResetMatch} className="shadow-lg">
              <RotateCcw className="w-4 h-4 mr-1" />
              <span>New Match</span>
            </JuicyButton>
          ) : (
            <JuicyButton variant="platinum" size="md" onClick={onNextRound} className="shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              <span>Next Round</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </JuicyButton>
          )}
        </div>
      </motion.div>
    </div>
  );
};
