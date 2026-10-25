import React from 'react';
import { motion } from 'framer-motion';
import { RoundResolution, GameState } from '../../core/models/types';
import { Trophy, Target, Shield, X, Award, CheckCircle2 } from 'lucide-react';
import { JuicyButton } from './JuicyButton';

interface MatchScoreHistoryModalProps {
  gameState: GameState;
  roundHistory: RoundResolution[];
  onClose: () => void;
}

export const MatchScoreHistoryModal: React.FC<MatchScoreHistoryModalProps> = ({
  gameState,
  roundHistory,
  onClose,
}) => {
  const isTeamMode = gameState.rules.mode === 'TEAM_4P';

  const teamAPlayers = gameState.players.filter(p => p.teamId === 'TEAM_A');
  const teamBPlayers = gameState.players.filter(p => p.teamId === 'TEAM_B');

  const teamAScore = teamAPlayers.reduce((sum, p) => sum + p.cumulativeScore, 0);
  const teamBScore = teamBPlayers.reduce((sum, p) => sum + p.cumulativeScore, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none font-sans-clean">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="bg-gradient-to-b from-[#170b09] via-[#0d0605] to-[#0d0605] border-2 border-[#301a14] rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex justify-between items-center border-b border-[#301a14] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] flex items-center justify-center font-black text-base shadow-md">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg text-[#f7f0ea] tracking-tight">
                Match Scorecard & Round History
              </h3>
              <div className="flex items-center gap-2 text-xs text-[#f7f0ea]/70">
                <span className="text-[#e5c378] font-bold">
                  {isTeamMode ? '4-Player Team Mode (2v2)' : 'Solo Mode'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Target className="w-3 h-3 text-[#e5c378]" /> Target: {gameState.rules.targetScore}p
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#e5c378]/70 hover:text-white transition cursor-pointer border-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Leaderboard Summary Bar */}
        <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 mb-3 shrink-0 shadow-md">
          {isTeamMode ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Team A */}
              <div className="bg-[#e5c378]/10 border border-[#e5c378]/30 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-black text-[#e5c378]">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Team A (You)
                  </span>
                  <span className="text-base font-black font-mono text-[#f7f0ea]">{teamAScore}p</span>
                </div>
                <div className="w-full bg-[#170b09] rounded-full h-1.5 mt-2 overflow-hidden border border-[#301a14]">
                  <div
                    className="bg-gradient-to-r from-[#e5c378] to-[#b48d36] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (teamAScore / gameState.rules.targetScore) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Team B */}
              <div className="bg-[#c84b31]/10 border border-[#c84b31]/30 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-black text-[#c84b31]">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Team B
                  </span>
                  <span className="text-base font-black font-mono text-[#f7f0ea]">{teamBScore}p</span>
                </div>
                <div className="w-full bg-[#170b09] rounded-full h-1.5 mt-2 overflow-hidden border border-[#301a14]">
                  <div
                    className="bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (teamBScore / gameState.rules.targetScore) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Solo Players Leaderboard */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {gameState.players.map(p => (
                <div
                  key={p.id}
                  className="bg-[#170b09] border border-[#301a14] rounded-xl p-2 flex flex-col items-center"
                >
                  <span className="font-bold text-[#f7f0ea] truncate w-full">{p.name}</span>
                  <span className="text-sm font-black font-mono text-[#e5c378] mt-0.5">
                    {p.cumulativeScore}p
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Round-by-Round Score Ledger */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {roundHistory.length === 0 ? (
            <div className="text-center py-8 px-4 bg-[#0d0605] border border-[#301a14] rounded-2xl">
              <Award className="w-10 h-10 text-[#e5c378]/40 mx-auto mb-2" />
              <h4 className="font-serif font-black text-sm text-[#f7f0ea]">Round 1 in Progress</h4>
              <p className="text-xs text-[#f7f0ea]/60 mt-1 max-w-md mx-auto">
                No rounds have concluded yet. When a player declares Gin with a face-down slam, the full itemized score ledger for that round will be recorded here.
              </p>
            </div>
          ) : (
            roundHistory.map((round, idx) => (
              <div
                key={idx}
                className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5"
              >
                {/* Round Header */}
                <div className="flex justify-between items-center border-b border-[#301a14] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#e5c378]/20 text-[#e5c378] border border-[#e5c378]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      Round {idx + 1}
                    </span>
                    <span className="text-xs font-black text-[#f7f0ea] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#e5c378]" />
                      Winner:{' '}
                      <strong className="text-[#e5c378]">
                        {round.winningTeamId || round.winnerPlayerId}
                      </strong>
                    </span>
                  </div>

                  {round.isThousandPointRun && (
                    <span className="text-[10px] font-black bg-[#c84b31]/20 text-[#e5c378] px-2 py-0.5 rounded-full border border-[#e5c378]/40 animate-pulse font-mono">
                      ★ 1,000-Point Run
                    </span>
                  )}
                </div>

                {/* Team or Player Breakdown for this Round */}
                {round.teamScores ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {round.teamScores.map(t => (
                      <div
                        key={t.teamId}
                        className={`p-2.5 rounded-xl border ${
                          t.isWinner
                            ? 'bg-[#170b09] border-[#e5c378]/50 text-[#f7f0ea]'
                            : 'bg-[#0d0605] border-[#301a14] text-[#f7f0ea]/70'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold mb-1">
                          <span className={t.teamId === 'TEAM_A' ? 'text-[#e5c378]' : 'text-[#c84b31]'}>
                            {t.teamId}
                          </span>
                          <span className="font-black font-mono text-sm text-[#f7f0ea]">
                            {t.netRoundScore > 0 ? `+${t.netRoundScore}` : t.netRoundScore}p
                          </span>
                        </div>
                        <div className="text-[10px] text-[#f7f0ea]/60 space-y-0.5 font-mono">
                          <div className="flex justify-between">
                            <span className="font-sans-clean">Melds Score:</span>
                            <span className="text-[#e5c378] font-medium">+{t.meldScore}p</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-sans-clean">Deadwood Debt:</span>
                            <span className="text-rose-400 font-medium">-{t.debtScore}p</span>
                          </div>
                          {t.ginBonus > 0 && (
                            <div className="flex justify-between text-[#e5c378] font-bold">
                              <span className="font-sans-clean">Gin Bonus:</span>
                              <span>+{t.ginBonus}p</span>
                            </div>
                          )}
                          {t.zeroMeldPenalty < 0 && (
                            <div className="flex justify-between text-rose-400 font-bold">
                              <span className="font-sans-clean">Zero-Meld Penalty:</span>
                              <span>{t.zeroMeldPenalty}p</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-[#301a14] font-bold text-[#f7f0ea]">
                            <span className="font-sans-clean">Total After Round:</span>
                            <span className="text-[#e5c378] font-black">{t.newCumulativeScore}p</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Solo Player Scores for this Round */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {round.playerScores.map(p => (
                      <div
                        key={p.playerId}
                        className={`p-2 rounded-xl border ${
                          p.isWinner
                            ? 'bg-[#170b09] border-[#e5c378]/50 text-[#f7f0ea]'
                            : 'bg-[#0d0605] border-[#301a14] text-[#f7f0ea]/70'
                        }`}
                      >
                        <div className="font-bold text-[#f7f0ea] truncate">{p.name}</div>
                        <div className="text-xs font-black font-mono text-[#e5c378] mt-0.5">
                          {p.netRoundScore > 0 ? `+${p.netRoundScore}` : p.netRoundScore}p
                        </div>
                        <div className="text-[9px] text-[#f7f0ea]/50 mt-0.5 font-mono">
                          Total: {p.newCumulativeScore}p
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-[#301a14] flex justify-end shrink-0">
          <JuicyButton
            variant="gold"
            size="md"
            onClick={onClose}
          >
            Close Scorecard
          </JuicyButton>
        </div>
      </motion.div>
    </div>
  );
};
