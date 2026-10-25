import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '../../store/useSocialStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AVATAR_PRESETS } from '../../types/auth';
import {
  Users,
  UserPlus,
  Inbox,
  X,
  Copy,
  Check,
  RefreshCw,
  Search,
  Send,
  Swords,
  AlertCircle,
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteFriendToRoom?: (friendId: string) => void;
  activeRoomCode?: string;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  onInviteFriendToRoom,
  activeRoomCode,
}) => {
  const { profile, regenerateFriendCode } = useAuthStore();
  const {
    friends,
    pendingRequests,
    fetchFriends,
    sendFriendRequest,
    respondToFriendRequest,
    isLoading,
  } = useSocialStore();

  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'requests'>('friends');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen && profile?.id) {
      fetchFriends(profile.id);
    }
  }, [isOpen, profile?.id]);

  if (!isOpen) return null;

  const onlineFriends = friends.filter(f => f.presenceStatus !== 'OFFLINE');

  const handleCopyMyCode = () => {
    if (profile.friendCode) {
      navigator.clipboard?.writeText(profile.friendCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim() || !profile?.id) return;
    const res = await sendFriendRequest(profile.id, friendCodeInput.trim());
    setRequestStatus(res);
    if (res.success) {
      setFriendCodeInput('');
    }
    setTimeout(() => setRequestStatus(null), 4000);
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto font-sans-clean text-[#f7f0ea]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#301a14] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-lg sm:max-w-xl w-full my-auto max-h-[92dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[#301a14] pb-2.5 mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c84b31] to-[#8f2d1b] text-white flex items-center justify-center shadow border border-[#e5c378]/40">
                <Users className="w-4 h-4 text-[#e5c378]" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-[#f7f0ea] uppercase tracking-wider flex items-center gap-2 font-serif-luxury">
                  <span>Friends & Social</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#0d0605] border border-[#301a14] text-[#e5c378]">
                    {onlineFriends.length} Online
                  </span>
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#e5c378]/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close friends modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0d0605] border border-[#301a14] mb-3 shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('friends')}
              className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white font-black border-[#e5c378] shadow-[0_0_12px_rgba(200,75,49,0.35)]'
                  : 'text-[#f7f0ea]/60 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Friends ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                activeTab === 'add'
                  ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white font-black border-[#e5c378] shadow-[0_0_12px_rgba(200,75,49,0.35)]'
                  : 'text-[#f7f0ea]/60 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Add Friend</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative border ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white font-black border-[#e5c378] shadow-[0_0_12px_rgba(200,75,49,0.35)]'
                  : 'text-[#f7f0ea]/60 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 shrink-0" />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#c84b31] text-white text-[9px] font-black flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain pr-0.5 sm:pr-1 space-y-2.5">
            {/* TAB 1: FRIENDS LIST */}
            {activeTab === 'friends' && (
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <div className="p-8 text-center text-[#f7f0ea]/60 space-y-2 bg-[#0d0605] rounded-2xl border border-[#301a14]">
                    <Users className="w-8 h-8 mx-auto text-[#e5c378]/40" />
                    <p className="text-xs font-bold text-[#f7f0ea]">No friends added yet</p>
                    <p className="text-[10px] text-[#f7f0ea]/50 max-w-xs mx-auto">
                      Share your Friend Code with other players or enter their code to play together!
                    </p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black text-xs cursor-pointer inline-flex items-center gap-1.5 mt-2 shadow-md"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Friends</span>
                    </button>
                  </div>
                ) : (
                  friends.map(friend => {
                    const avatar =
                      AVATAR_PRESETS.find(a => a.id === friend.avatarId) || AVATAR_PRESETS[0];

                    const isOnline = friend.presenceStatus === 'IN_LOBBY';
                    const isInMatch = friend.presenceStatus === 'IN_MATCH';

                    return (
                      <div
                        key={friend.friendId}
                        className="p-2.5 rounded-2xl bg-[#0d0605] border border-[#301a14] flex items-center justify-between shadow-sm hover:border-[#e5c378]/30 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar with live status dot */}
                          <div className="relative shrink-0">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar.gradient} border border-[#301a14] flex items-center justify-center text-lg shadow`}
                            >
                              {avatar.icon}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0605] ${
                                isOnline
                                  ? 'bg-[#e5c378] shadow-[0_0_8px_rgba(229,195,120,0.8)]'
                                  : isInMatch
                                  ? 'bg-[#c84b31] shadow-[0_0_8px_rgba(200,75,49,0.8)]'
                                  : 'bg-stone-600'
                              }`}
                              title={
                                isOnline
                                  ? 'Online in Lobby'
                                  : isInMatch
                                  ? 'Currently Playing Match'
                                  : 'Offline'
                              }
                            />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#f7f0ea] truncate">
                                {friend.displayName}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#301a14] text-[#e5c378]">
                                LVL {friend.level}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#f7f0ea]/60 flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-[#e5c378]/70 font-bold">{friend.friendCode}</span>
                              <span>•</span>
                              {isOnline && (
                                <span className="text-[#e5c378] font-bold flex items-center gap-1">
                                  <span>In Lobby</span>
                                </span>
                              )}
                              {isInMatch && (
                                <span className="text-amber-300 font-bold flex items-center gap-1">
                                  <span>Playing {friend.currentMatchInfo?.mode || 'Match'}</span>
                                </span>
                              )}
                              {friend.presenceStatus === 'OFFLINE' && (
                                <span className="text-[#f7f0ea]/40">Offline</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Invite or Status Action */}
                        <div className="shrink-0 ml-2">
                          {onInviteFriendToRoom && activeRoomCode ? (
                            <button
                              onClick={() => onInviteFriendToRoom(friend.friendId)}
                              disabled={!isOnline}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                                isOnline
                                  ? 'bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black shadow'
                                  : 'bg-[#301a14]/60 text-[#f7f0ea]/40 border border-[#301a14] cursor-not-allowed'
                              }`}
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Invite</span>
                            </button>
                          ) : (
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-lg border ${
                                isOnline
                                  ? 'bg-[#e5c378]/15 border-[#e5c378]/40 text-[#e5c378]'
                                  : isInMatch
                                  ? 'bg-[#c84b31]/15 border-[#c84b31]/40 text-[#c84b31]'
                                  : 'bg-[#170b09] border-[#301a14] text-[#f7f0ea]/40'
                              }`}
                            >
                              {isOnline ? 'Available' : isInMatch ? 'In Game' : 'Offline'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: ADD FRIEND (STRICT PRIVACY VIA CODE) */}
            {activeTab === 'add' && (
              <div className="space-y-3">
                {/* Your Friend Code Card */}
                <div className="p-3.5 rounded-2xl bg-[#0d0605] border border-[#301a14] text-center space-y-2 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#e5c378]/70">
                    Your Player Friend Code
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#e5c378] tracking-wider">
                      {profile.friendCode}
                    </span>
                    <button
                      onClick={handleCopyMyCode}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#f7f0ea] transition cursor-pointer"
                      title="Copy Friend Code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-[#e5c378]" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => regenerateFriendCode()}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#f7f0ea] transition cursor-pointer"
                      title="Generate New Friend Code"
                    >
                      <RefreshCw className="w-4 h-4 text-[#e5c378]/70 hover:rotate-180 transition-transform duration-300" />
                    </button>
                  </div>
                  <p className="text-[10px] text-[#f7f0ea]/50 max-w-xs mx-auto">
                    Give this code to friends so they can add you directly to their table!
                  </p>
                </div>

                {/* Search & Send Request Form */}
                <form onSubmit={handleSendRequest} className="p-3.5 rounded-2xl bg-[#0d0605] border border-[#301a14] space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#f7f0ea]">
                    <UserPlus className="w-4 h-4 text-[#e5c378]" />
                    <span>Enter Friend's Code</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#e5c378]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={12}
                        value={friendCodeInput}
                        onChange={e => setFriendCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. DIGU-1104"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#170b09] border border-[#301a14] focus:border-[#e5c378] text-xs font-mono font-bold text-[#f7f0ea] outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!friendCodeInput.trim() || isLoading}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {requestStatus && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                        requestStatus.success
                          ? 'bg-[#e5c378]/15 border-[#e5c378]/40 text-[#e5c378]'
                          : 'bg-rose-950/60 border-rose-800 text-rose-200'
                      }`}
                    >
                      {requestStatus.success ? (
                        <Check className="w-4 h-4 text-[#e5c378] shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{requestStatus.message}</span>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* TAB 3: PENDING REQUESTS */}
            {activeTab === 'requests' && (
              <div className="space-y-2">
                {pendingRequests.length === 0 ? (
                  <div className="p-8 text-center text-[#f7f0ea]/50 space-y-2 bg-[#0d0605] rounded-2xl border border-[#301a14]">
                    <Inbox className="w-8 h-8 mx-auto text-[#e5c378]/30" />
                    <p className="text-xs font-bold text-[#f7f0ea]">No pending friend requests</p>
                    <p className="text-[10px] text-[#f7f0ea]/50">
                      When players send you a friend request using your Friend Code, it will appear here.
                    </p>
                  </div>
                ) : (
                  pendingRequests.map(req => {
                    const avatar =
                      AVATAR_PRESETS.find(a => a.id === req.avatarId) || AVATAR_PRESETS[0];

                    return (
                      <div
                        key={req.requestId}
                        className="p-3 rounded-2xl bg-[#0d0605] border border-[#301a14] flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatar.gradient} border border-[#301a14] flex items-center justify-center text-lg shadow`}
                          >
                            {avatar.icon}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#f7f0ea]">{req.displayName}</div>
                            <div className="text-[10px] text-[#e5c378]/70 font-mono">{req.friendCode}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const reqId = req.requestId || (req as any).request_id;
                              if (profile?.id && reqId) {
                                respondToFriendRequest(reqId, true, profile.id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black text-xs transition cursor-pointer shadow active:scale-95"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              const reqId = req.requestId || (req as any).request_id;
                              if (profile?.id && reqId) {
                                respondToFriendRequest(reqId, false, profile.id);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#301a14] hover:bg-[#4a2820] text-[#f7f0ea]/70 font-bold text-xs transition cursor-pointer active:scale-95"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#301a14] pt-2.5 mt-2.5 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-black cursor-pointer shadow-md"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
