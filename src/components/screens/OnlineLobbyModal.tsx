import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TableRules } from '../../core/models/types';
import { Globe, Copy, Check, ChevronLeft, Bot, Radio, Plus, KeyRound, Coins, Sparkles, AlertCircle, RotateCcw, Users, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import { useSocialStore } from '../../store/useSocialStore';
import { DatabaseService } from '../../services/databaseService';
import { RoomSeat, GameRoom } from '../../types/database';
import { AVATAR_PRESETS } from '../../types/auth';
import { JuicyButton } from '../shared/JuicyButton';

interface OnlineLobbyModalProps {
  pendingRules: TableRules;
  onPlayVSAI: () => void;
  onBack: () => void;
  initialTab?: LobbyTab;
}

type LobbyTab = 'CREATE_ROOM' | 'JOIN_ROOM' | 'QUICK_MATCH';

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  pendingRules,
  onPlayVSAI,
  onBack,
  initialTab = 'CREATE_ROOM',
}) => {
  const profile = useAuthStore(state => state.profile);
  const claimDailyBonus = useAuthStore(state => state.claimDailyBonus);
  const { confirmAndStartMatch, updatePendingRules } = useGameStore();

  const [activeTab, setActiveTab] = useState<LobbyTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [selectedStake, setSelectedStake] = useState<number>(pendingRules.buyIn ?? 1000);
  const [selectedTarget, setSelectedTarget] = useState<number>(pendingRules.targetScore ?? 1000);
  
  // Private Room State
  const [privateRoomCode, setPrivateRoomCode] = useState<string>(() => DatabaseService.generateRoomCode());
  const [joinInputCode, setJoinInputCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dailyClaimMsg, setDailyClaimMsg] = useState<string | null>(null);

  // Social & Private Waiting Room State (Real Players Only)
  const { friends, sendMatchInvite } = useSocialStore();
  const [invitedSeats, setInvitedSeats] = useState<Record<number, { friendName: string; avatarId: string }>>({});
  const [joinedSeats, setJoinedSeats] = useState<Record<number, { playerName: string; avatarId: string }>>({});
  const [friendPickerSeatIndex, setFriendPickerSeatIndex] = useState<number | null>(null);

  // Matchmaking State
  const [isSearching, setIsSearching] = useState(false);
  const [matchedSeats, setMatchedSeats] = useState<RoomSeat[]>([]);
  const [matchCountdown, setMatchCountdown] = useState<number | null>(null);
  const matchmakingCancelRef = useRef<(() => void) | null>(null);

  const maxPlayers = pendingRules.mode === 'SOLO_2P' ? 2 : 4;
  const currentPot = selectedStake * maxPlayers;
  const hasEnoughCoins = profile.coins >= selectedStake;

  // Start matchmaking simulation on mount or tab change
  useEffect(() => {
    if (activeTab === 'QUICK_MATCH' && hasEnoughCoins) {
      setIsSearching(true);
      setMatchedSeats([]);
      setMatchCountdown(null);

      const controller = DatabaseService.simulateMatchmaking(
        pendingRules.mode,
        selectedStake,
        selectedTarget,
        profile,
        (seat, filledCount, totalCount) => {
          setMatchedSeats(prev => {
            const next = [...prev];
            const idx = next.findIndex(s => s.seatIndex === seat.seatIndex);
            if (idx >= 0) {
              next[idx] = seat;
            } else {
              next.push(seat);
            }
            return next.sort((a, b) => a.seatIndex - b.seatIndex);
          });

          if (filledCount === totalCount) {
            setIsSearching(false);
            setMatchCountdown(3);
          }
        },
        (room: GameRoom) => {
          updatePendingRules({
            buyIn: selectedStake,
            targetScore: selectedTarget,
            roomCode: room.roomCode,
            playType: 'ONLINE',
          });
          confirmAndStartMatch();
        }
      );

      matchmakingCancelRef.current = controller.cancel;

      return () => {
        controller.cancel();
      };
    }
  }, [activeTab, selectedStake, selectedTarget, pendingRules.mode, hasEnoughCoins, profile]);

  // Countdown timer when table is full
  useEffect(() => {
    if (matchCountdown === null) return;
    if (matchCountdown <= 0) return;

    const timer = setTimeout(() => {
      setMatchCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [matchCountdown]);

  // Synchronize private room with DatabaseService so other players joining via room code or invites appear in real-time
  useEffect(() => {
    if (activeTab !== 'CREATE_ROOM') return;

    // Register this room in database
    DatabaseService.createRoom(
      profile,
      pendingRules.mode,
      selectedStake,
      selectedTarget,
      true
    );

    const pollInterval = setInterval(() => {
      const room = DatabaseService.getRoomByCode(privateRoomCode);
      if (room) {
        const nextJoined: Record<number, { playerName: string; avatarId: string }> = {};
        room.seats.forEach(s => {
          if (s.seatIndex !== 0 && s.isConnected && !s.isBot) {
            nextJoined[s.seatIndex] = {
              playerName: s.playerName,
              avatarId: s.avatarId,
            };
          }
        });
        setJoinedSeats(nextJoined);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [activeTab, privateRoomCode, profile, pendingRules.mode, selectedStake, selectedTarget]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(privateRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaimDaily = () => {
    const res = claimDailyBonus();
    setDailyClaimMsg(res.message ?? (res.success ? 'Received +1,000 Coins!' : 'Already claimed'));
    setTimeout(() => setDailyClaimMsg(null), 3500);
  };

  const handleLaunchPrivateRoom = () => {
    if (!hasEnoughCoins) return;
    const joinedCount = 1 + Object.keys(joinedSeats).length;
    if (joinedCount < maxPlayers) return;

    updatePendingRules({
      buyIn: selectedStake,
      targetScore: selectedTarget,
      roomCode: privateRoomCode,
      playType: 'ONLINE',
    });
    confirmAndStartMatch();
  };

  const handleJoinWithCode = () => {
    setJoinError(null);
    const clean = joinInputCode.trim().toUpperCase();
    if (!clean) {
      setJoinError('Please enter a 6-digit room code');
      return;
    }
    const formattedCode = clean.startsWith('THAAS-') ? clean : `THAAS-${clean.replace(/[^0-9]/g, '')}`;

    if (profile.coins < selectedStake) {
      setJoinError(`Insufficient coins. Need ${selectedStake.toLocaleString()} coins.`);
      return;
    }

    const joinResult = DatabaseService.joinRoom(formattedCode, profile);
    if (!joinResult.success) {
      setJoinError(joinResult.error || 'Could not find or join room');
      return;
    }

    // Connect to room or start synchronized table
    const targetRoom = joinResult.room!;
    updatePendingRules({
      buyIn: targetRoom.stakeBuyIn,
      targetScore: targetRoom.targetScore,
      roomCode: targetRoom.roomCode,
      mode: targetRoom.mode,
      playType: 'ONLINE',
    });
    confirmAndStartMatch();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto font-sans-clean text-[#f7f0ea]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(200,75,49,0.15)] max-w-xl w-full text-[#f7f0ea] relative my-auto max-h-[96dvh] flex flex-col justify-between border-2 border-[#301a14]"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#301a14] pb-2.5 mb-3 shrink-0">
          <button
            onClick={() => {
              if (matchmakingCancelRef.current) matchmakingCancelRef.current();
              onBack();
            }}
            className="flex items-center gap-1 text-xs font-bold text-[#e5c378]/70 hover:text-white cursor-pointer active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#e5c378]" />
            <h3 className="font-black text-xs sm:text-sm text-[#e5c378] uppercase tracking-wider font-serif-luxury">
              Online Multiplayer
            </h3>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0d0605] border border-[#301a14] text-xs font-mono font-bold text-[#e5c378] shadow">
            <span>🪙</span>
            <span>{profile.coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Tab Navigation (Segmented Control) */}
        <div className="grid grid-cols-3 gap-1 bg-[#0d0605] border border-[#301a14] p-1 rounded-2xl mb-3 shrink-0">
          <button
            onClick={() => setActiveTab('CREATE_ROOM')}
            className={`py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border ${
              activeTab === 'CREATE_ROOM'
                ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white border-[#e5c378] shadow-[0_0_12px_rgba(200,75,49,0.35)]'
                : 'text-[#f7f0ea]/60 border-transparent hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Host Table</span>
          </button>

          <button
            onClick={() => setActiveTab('JOIN_ROOM')}
            className={`py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border ${
              activeTab === 'JOIN_ROOM'
                ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white border-[#e5c378] shadow-[0_0_12px_rgba(200,75,49,0.35)]'
                : 'text-[#f7f0ea]/60 border-transparent hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join Code</span>
          </button>

          <button
            onClick={() => setActiveTab('QUICK_MATCH')}
            className={`py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border ${
              activeTab === 'QUICK_MATCH'
                ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white border-[#e5c378] shadow-[0_0_12px_rgba(200,75,49,0.35)]'
                : 'text-[#f7f0ea]/60 border-transparent hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Matchmaking</span>
          </button>
        </div>

        {/* Low Coins Refill Alert Banner */}
        {!hasEnoughCoins && (
          <div className="bg-rose-950/40 rounded-2xl p-3 mb-3 shrink-0 flex items-center justify-between gap-2 border-0 shadow">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-rose-300">Insufficient Coins</span>
                <span className="text-[10px] text-rose-200/80">Need {selectedStake.toLocaleString()} for this table.</span>
              </div>
            </div>
            <button
              onClick={handleClaimDaily}
              className="btn-3d-gold px-3 py-1.5 rounded-xl text-[#1A1202] text-xs font-black transition cursor-pointer shrink-0"
            >
              +1,000 Free
            </button>
          </div>
        )}

        {dailyClaimMsg && (
          <div className="bg-[#e5c378]/15 border border-[#e5c378]/40 text-[#e5c378] text-xs font-bold p-2.5 rounded-xl mb-2 text-center animate-pulse">
            {dailyClaimMsg}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: QUICK MATCHMAKING                                 */}
        {/* ======================================================== */}
        {activeTab === 'QUICK_MATCH' && (
          <div className="flex flex-col my-auto space-y-3">
            {/* Stake Tier Selector */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
              <span className="text-[10px] uppercase font-black text-[#e5c378]/70 tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#e5c378]" /> Stake
              </span>
              <div className="flex items-center gap-1.5">
                {[250, 1000, 5000].map(stake => (
                  <button
                    key={stake}
                    onClick={() => setSelectedStake(stake)}
                    className={`px-3 py-1 rounded-xl font-mono font-black text-xs transition cursor-pointer border-0 ${
                      selectedStake === stake
                        ? 'bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] shadow-[0_0_10px_rgba(229,195,120,0.4)]'
                        : 'bg-white/[0.05] text-[#f7f0ea]/70 hover:bg-white/[0.08]'
                    }`}
                  >
                    {stake >= 1000 ? `${stake / 1000}k` : stake}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-[#e5c378]">
                Pot: {currentPot.toLocaleString()}
              </span>
            </div>

            {/* Matchmaking Radar + Status Animation */}
            <div className="flex flex-col items-center justify-center py-2 shrink-0">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {isSearching ? (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-[#e5c378]/25 animate-ping" />
                    <div className="absolute inset-2 rounded-full border border-[#e5c378]/20 animate-pulse" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c84b31] to-[#e5c378] text-[#0d0605] flex items-center justify-center shadow-lg z-10">
                      <Radio className="w-5 h-5 animate-spin" />
                    </div>
                  </>
                ) : matchCountdown !== null ? (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] border-2 border-[#e5c378] flex items-center justify-center shadow-xl z-10 font-mono font-black text-2xl animate-bounce">
                    {matchCountdown > 0 ? matchCountdown : 'GO!'}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#e5c378] text-[#0d0605] flex items-center justify-center shadow-lg z-10">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>

              <span className="text-xs sm:text-sm font-black text-[#e5c378] mt-2 flex items-center gap-1.5 font-sans-clean">
                {matchCountdown !== null
                  ? `Match Starting in ${matchCountdown}s...`
                  : `Finding ${pendingRules.mode === 'TEAM_4P' ? '2v2 Team' : 'Online'} Opponents...`}
              </span>
            </div>

            {/* Seated Players Presence Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: maxPlayers }).map((_, seatIdx) => {
                const seat = matchedSeats.find(s => s.seatIndex === seatIdx);
                const isHost = seatIdx === 0;
                const avatar = seat ? AVATAR_PRESETS.find(a => a.id === seat.avatarId) : null;

                return (
                  <div
                    key={seatIdx}
                    className={`rounded-2xl p-2.5 flex flex-col items-center text-center justify-between transition-all border ${
                      seat
                        ? 'bg-[#170b09] border-[#e5c378]/50 text-[#f7f0ea] shadow'
                        : 'bg-[#0d0605]/80 border-[#301a14] text-[#f7f0ea]/40 opacity-70'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-[#e5c378]/70 mb-1">
                      {seatIdx === 0 ? 'You (South)' : `Seat ${seatIdx + 1}`}
                    </span>

                    <div className="w-9 h-9 rounded-xl bg-[#0d0605] border border-[#301a14] flex items-center justify-center text-base mb-1 shadow-inner">
                      {seat ? avatar?.icon ?? '👤' : '⏳'}
                    </div>

                    <span className="text-xs font-black truncate max-w-full text-[#f7f0ea]">
                      {seat ? (isHost ? profile.displayName : seat.playerName) : 'Searching...'}
                    </span>

                    <span
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 ${
                        seat ? 'bg-[#e5c378]/20 text-[#e5c378]' : 'bg-white/5 text-[#f7f0ea]/40'
                      }`}
                    >
                      {seat ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: HOST PRIVATE TABLE                                */}
        {/* ======================================================== */}
        {activeTab === 'CREATE_ROOM' && (
          <div className="flex flex-col my-auto space-y-2.5">
            {/* Room Code Showcase */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-md">
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-black text-[#e5c378]/70 tracking-wider">
                  Private Room Code
                </span>
                <span className="text-lg sm:text-xl font-mono font-black tracking-widest text-[#e5c378]">
                  #{privateRoomCode}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPrivateRoomCode(DatabaseService.generateRoomCode())}
                  title="Generate New Code"
                  className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[#f7f0ea] transition cursor-pointer border-0 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[#f7f0ea] text-xs font-bold transition active:scale-95 cursor-pointer shadow border-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#e5c378]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Stake & Target Configuration */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-2 flex flex-col justify-between shadow-sm text-left">
                <span className="text-[9.5px] font-black text-[#e5c378]/70 uppercase mb-1">
                  Table Buy-In
                </span>
                <div className="flex items-center gap-1">
                  {[250, 1000, 5000].map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedStake(s)}
                      className={`flex-1 py-1 rounded-xl font-mono font-black text-xs transition cursor-pointer border-0 ${
                        selectedStake === s
                          ? 'bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] shadow-[0_0_10px_rgba(229,195,120,0.4)]'
                          : 'bg-white/[0.05] text-[#f7f0ea]/70 hover:bg-white/[0.08]'
                      }`}
                    >
                      {s >= 1000 ? `${s / 1000}k` : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-2 flex flex-col justify-between shadow-sm text-left">
                <span className="text-[9.5px] font-black text-[#e5c378] uppercase mb-1">
                  Match Target
                </span>
                <div className="flex items-center gap-1">
                  {[500, 1000].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTarget(t)}
                      className={`flex-1 py-1 rounded-xl font-mono font-black text-xs transition cursor-pointer border-0 ${
                        selectedTarget === t
                          ? 'bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] shadow-[0_0_10px_rgba(229,195,120,0.4)]'
                          : 'bg-white/[0.05] text-[#f7f0ea]/70 hover:bg-white/[0.08]'
                      }`}
                    >
                      {t}p
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive 4-Seat Waiting Pedestals (Zero Bots, Real Players Only) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: maxPlayers }).map((_, seatIdx) => {
                const isHost = seatIdx === 0;
                const invited = invitedSeats[seatIdx];
                const joined = joinedSeats[seatIdx];
                const teamLabel =
                  pendingRules.mode === 'TEAM_4P'
                    ? seatIdx % 2 === 0
                      ? 'Team A'
                      : 'Team B'
                    : `Seat ${seatIdx + 1}`;

                return (
                  <div
                    key={seatIdx}
                    className={`rounded-2xl p-2 flex flex-col items-center text-center justify-between transition-all border min-h-[105px] ${
                      isHost || joined
                        ? 'bg-[#170b09] border-[#e5c378]/60 text-[#f7f0ea] shadow'
                        : invited
                        ? 'bg-[#170b09] border-[#301a14] text-[#f7f0ea]/80'
                        : 'bg-[#0d0605] border-[#301a14] text-[#f7f0ea]/40'
                    }`}
                  >
                    <span className="text-[8.5px] font-mono font-bold text-[#e5c378]/70">
                      {isHost ? '👑 Host' : teamLabel}
                    </span>

                    {/* Seat Avatar / Icon */}
                    <div className="relative my-1">
                      <div className="w-8 h-8 rounded-xl bg-[#0d0605] border border-[#301a14] flex items-center justify-center text-base shadow">
                        {isHost ? (
                          '👑'
                        ) : joined ? (
                          '👤'
                        ) : invited ? (
                          '📩'
                        ) : (
                          <Plus className="w-4 h-4 text-[#e5c378]/50" />
                        )}
                      </div>
                      {(isHost || joined) && (
                        <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#e5c378] border border-black" />
                      )}
                    </div>

                    {/* Seat Name */}
                    <span className="text-[11px] font-black truncate max-w-full text-[#f7f0ea] mb-1">
                      {isHost
                        ? profile.displayName
                        : joined
                        ? joined.playerName
                        : invited
                        ? invited.friendName
                        : 'Empty Seat'}
                    </span>

                    {/* Actions or Status */}
                    {isHost ? (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-[#e5c378]/20 text-[#e5c378] border border-[#e5c378]/40">
                        Ready
                      </span>
                    ) : joined ? (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-[#e5c378]/20 text-[#e5c378] border border-[#e5c378]/40">
                        Ready
                      </span>
                    ) : invited ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-[#e5c378] animate-pulse">Invited...</span>
                        <button
                          onClick={() => {
                            const next = { ...invitedSeats };
                            delete next[seatIdx];
                            setInvitedSeats(next);
                          }}
                          className="p-0.5 text-[#e5c378]/60 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setFriendPickerSeatIndex(seatIdx)}
                        className="w-full py-1 rounded-lg bg-[#301a14] hover:bg-[#4a2820] border border-[#e5c378]/30 text-[#e5c378] text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-0.5"
                      >
                        <UserPlus className="w-2.5 h-2.5" />
                        <span>Invite</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Friend Picker Overlay (When inviting to a seat) */}
            {friendPickerSeatIndex !== null && (
              <div className="p-2.5 rounded-2xl bg-[#0d0605] border border-[#e5c378]/60 space-y-2 shadow-lg animate-in zoom-in-95 text-left">
                <div className="flex items-center justify-between border-b border-[#301a14] pb-1.5">
                  <span className="text-xs font-black text-[#f7f0ea] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#e5c378]" />
                    <span>Invite Friend to Seat {friendPickerSeatIndex + 1}</span>
                  </span>
                  <button
                    onClick={() => setFriendPickerSeatIndex(null)}
                    className="p-1 text-[#e5c378]/60 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {friends.length === 0 ? (
                    <div className="text-center py-2 text-[11px] text-[#f7f0ea]/60">
                      No friends online yet. You can share your Room Code <strong className="text-[#e5c378]">#{privateRoomCode}</strong>!
                    </div>
                  ) : (
                    friends.map(friend => {
                      const isOnline = friend.presenceStatus === 'IN_LOBBY';
                      return (
                        <div
                          key={friend.friendId}
                          className="p-1.5 rounded-xl bg-[#170b09] border border-[#301a14] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline ? 'bg-[#e5c378]' : 'bg-stone-600'
                              }`}
                            />
                            <span className="font-bold text-[#f7f0ea] text-xs">{friend.displayName}</span>
                            <span className="text-[9px] text-[#e5c378]/60 font-mono">({friend.friendCode})</span>
                          </div>
                          <button
                            onClick={() => {
                              sendMatchInvite(
                                friend.friendId,
                                undefined,
                                privateRoomCode,
                                pendingRules.mode,
                                selectedStake,
                                selectedTarget
                              );
                              setInvitedSeats(prev => ({
                                ...prev,
                                [friendPickerSeatIndex!]: {
                                  friendName: friend.displayName,
                                  avatarId: friend.avatarId,
                                },
                              }));
                              setFriendPickerSeatIndex(null);
                            }}
                            className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black text-[10px] cursor-pointer"
                          >
                            Send Invite
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Launch Room Button (Waiting for Real Players) */}
            {(() => {
              const joinedCount = 1 + Object.keys(joinedSeats).length;
              const isFull = joinedCount >= maxPlayers;

              return (
                <div className="space-y-1.5 mt-1">
                  <JuicyButton
                    variant="gold"
                    size="md"
                    onClick={handleLaunchPrivateRoom}
                    disabled={!isFull || !hasEnoughCoins}
                    className="w-full"
                  >
                    {isFull ? (
                      <>
                        <Sparkles className="w-4 h-4 fill-slate-950" />
                        <span>Start Match</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 text-stone-700" />
                        <span>Waiting for Players ({joinedCount}/{maxPlayers})</span>
                      </>
                    )}
                  </JuicyButton>

                  {!isFull && (
                    <p className="text-[10px] text-[#f7f0ea]/60 text-center font-medium">
                      Share room code <span className="font-mono font-bold text-[#e5c378]">#{privateRoomCode}</span> or tap <span className="text-[#e5c378] font-bold">Invite</span> to fill the table with friends.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: JOIN PRIVATE TABLE BY CODE                        */}
        {/* ======================================================== */}
        {activeTab === 'JOIN_ROOM' && (
          <div className="flex flex-col my-auto space-y-3.5">
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-4 flex flex-col text-left shadow-md">
              <label className="text-[10px] uppercase font-black text-[#e5c378]/70 tracking-wider mb-2">
                Enter 6-Digit Room Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 8842 or THAAS-8842"
                  value={joinInputCode}
                  onChange={e => setJoinInputCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#170b09] border border-[#301a14] rounded-xl px-3.5 py-2.5 font-mono font-black text-sm sm:text-base text-[#f7f0ea] uppercase tracking-widest placeholder:text-[#f7f0ea]/30 outline-none focus:ring-2 focus:ring-[#e5c378]"
                />
              </div>

              {joinError && (
                <span className="text-[10px] font-bold text-rose-400 mt-2">
                  {joinError}
                </span>
              )}
            </div>

            <JuicyButton
              variant="gold"
              size="md"
              onClick={handleJoinWithCode}
              disabled={!hasEnoughCoins}
              className="w-full mt-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Join Table</span>
            </JuicyButton>
          </div>
        )}

        {/* Fallback Option: Play VS AI Instead */}
        <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-2.5 mt-3 shrink-0 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#170b09] border border-[#301a14] text-[#e5c378] flex items-center justify-center shrink-0 shadow">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-[#f7f0ea]">
              Play VS AI Offline
            </span>
          </div>
          <button
            onClick={() => {
              if (matchmakingCancelRef.current) matchmakingCancelRef.current();
              onPlayVSAI();
            }}
            className="px-3 py-1 rounded-xl font-black text-xs uppercase tracking-wider bg-white/[0.08] hover:bg-white/[0.12] text-[#e5c378] active:scale-95 cursor-pointer shrink-0 border-0"
          >
            Play Offline
          </button>
        </div>
      </motion.div>
    </div>
  );
};
