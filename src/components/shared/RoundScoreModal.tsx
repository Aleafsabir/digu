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
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    }, 400);

    const t2 = setTimeout(() => {
      setBeatStage(2);
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    }, 950);

    const t3 = setTimeout(() => {
      setBeatStage(3);
      try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
    }, 1500);

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
  const matchWinShare = pendingRules.mode === 'TEAM_4P' ? Math.round(netPot / 2) : netPot;

  useEffect(() => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;

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
    ? `${resolution.winningTeamId} WINS THE ROUND!`
    : `${winnerPlayer?.name || resolution.winnerPlayerId} WINS THE ROUND!`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-slate-700 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col gap-4 sm:gap-5 text-white"
      >
        {/* Modal Header */}
        <div className="text-center border-b border-emerald-950 pb-3 font-sans-clean">
          <motion.div
            animate={beatStage >= 3 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.4 }}
            className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-stone-950 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(255,255,255,0.35)] border border-white"
          >
            🏆
          </motion.div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {winnerTitle}
          </h2>
          {resolution.isThousandPointRun && (
            <p className="text-xs font-black text-[#05D59A] mt-1 animate-pulse">
              ★ 1,000-POINT SUITED RUN BONUS ACHIEVED ★
            </p>
          )}
        </div>

        {/* High-Stakes Championship Pot Payout Banner */}
        {resolution.matchOver && (
          <div className="bg-[#02140D]/90 border border-slate-700/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F1F5F9] flex items-center gap-1.5 font-sans-clean">
              <Coins className="w-4 h-4 text-slate-300" />
              {humanWon ? '🏆 Match Championship Pot Payout' : 'Table Pot Settled'}
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-[#F1F5F9] font-mono">
                {humanWon ? `+${matchWinShare.toLocaleString()} Coins` : `${tablePot.toLocaleString()} Total Pot`}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold font-mono">
                ({tablePot.toLocaleString()} Pot − 5% House Rake)
              </span>
            </div>
          </div>
        )}

        {/* 3-Beat Theatrical Score Breakdown (Team Scores or Solo) */}
        {resolution.teamScores ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans-clean">
            {resolution.teamScores.map(t => {
              const isWinTeam = t.isWinner;
              return (
                <div
                  key={t.teamId}
                  className={`p-4 rounded-2xl border shadow-md transition-all ${
                    isWinTeam
                      ? 'bg-emerald-950/40 border-slate-400/60 shadow-[0_0_20px_rgba(5,213,154,0.15)]'
                      : 'bg-[#02140D]/85 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-sm text-white tracking-wide">{t.teamId}</span>
                    <span className="font-mono text-sm font-black text-slate-400">
                      Cumul: <span className="text-white">{t.newCumulativeScore}p</span>
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {/* Beat 1: Melds */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#05D59A]" />
                        <span>Melds:</span>
                      </span>
                      <span className="font-black text-[#05D59A]">
                        {beatStage >= 1 ? `+${t.meldScore}p` : '...'}
                      </span>
                    </div>

                    {/* Beat 2: Debt */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span>Debt:</span>
                      </span>
                      <span className="font-black text-rose-300">
                        {beatStage >= 2 ? (t.debtScore === 0 ? '0p (Clean)' : `-${t.debtScore}p`) : '...'}
                      </span>
                    </div>

                    {/* Beat 3: Gin Bonus */}
                    {t.ginBonus > 0 && (
                      <div className="flex justify-between items-center bg-white/10 px-2 py-1 rounded-lg border border-slate-400/40">
                        <span className="text-[#F1F5F9] font-black flex items-center gap-1 font-sans-clean">
                          <span>★</span>
                          <span>Gin Bonus:</span>
                        </span>
                        <span className="font-black text-[#F1F5F9]">
                          {beatStage >= 3 ? `+${t.ginBonus}p` : '...'}
                        </span>
                      </div>
                    )}

                    {/* Net Round Total */}
                    <div className="flex justify-between items-center border-t border-emerald-950 pt-2 font-bold font-sans-clean">
                      <span className="text-white">Net Round:</span>
                      <span
                        className={`text-xl font-mono font-black ${
                          t.netRoundScore >= 0 ? 'text-[#05D59A]' : 'text-rose-400'
                        }`}
                      >
                        {beatStage >= 3
                          ? `${t.netRoundScore > 0 ? `+${t.netRoundScore}` : t.netRoundScore}p`
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
          <div className="bg-[#02140D]/90 rounded-2xl p-4 border border-slate-800 shadow-md">
            <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-wider font-mono">
              STANDINGS & NET ROUND SCORE
            </h4>
            <div className="space-y-1.5 font-mono text-xs">
              {(resolution.playerScores || []).map(p => (
                <div
                  key={p.playerId}
                  className="flex justify-between items-center bg-[#031B11] px-3.5 py-2.5 rounded-xl border border-slate-800"
                >
                  <span className="font-bold text-slate-100 font-sans-clean">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-black ${
                        p.netRoundScore >= 0 ? 'text-[#05D59A]' : 'text-rose-400'
                      }`}
                    >
                      {beatStage >= 3
                        ? `${p.netRoundScore > 0 ? `+${p.netRoundScore}` : p.netRoundScore}p`
                        : '...'}
                    </span>
                    <span className="text-white font-black w-14 text-right">
                      {p.newCumulativeScore}p
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={startBeatSequence}
            className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase bg-[#02140D] text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition font-sans-clean"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replay Tally</span>
          </button>

          {resolution.matchOver ? (
            <JuicyButton variant="platinum" size="md" onClick={onResetMatch}>
              <RotateCcw className="w-4 h-4 mr-1" />
              <span>New Match</span>
            </JuicyButton>
          ) : (
            <JuicyButton variant="platinum" size="md" onClick={onNextRound}>
              <span>Next Round</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </JuicyButton>
          )}
        </div>
      </motion.div>
    </div>
  );
};
