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
  const profile = useAuthStore(state => state.profile);
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
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto font-sans-clean"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-slate-700 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-lg sm:max-w-xl w-full my-auto max-h-[92dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-emerald-950 pb-2.5 mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#05D59A] to-[#047857] text-[#02140D] flex items-center justify-center shadow">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Friends & Social</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                    {onlineFriends.length} Online
                  </span>
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close friends modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#010D08] border border-slate-800/80 mb-3 shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('friends')}
              className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-[#05D59A] to-[#047857] text-[#02140D] font-black border-[#00F5AE] shadow-[0_0_12px_rgba(5,213,154,0.35)]'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Friends ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                activeTab === 'add'
                  ? 'bg-gradient-to-r from-[#05D59A] to-[#047857] text-[#02140D] font-black border-[#00F5AE] shadow-[0_0_12px_rgba(5,213,154,0.35)]'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Add Friend</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative border ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-[#05D59A] to-[#047857] text-[#02140D] font-black border-[#00F5AE] shadow-[0_0_12px_rgba(5,213,154,0.35)]'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 shrink-0" />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
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
                  <div className="p-8 text-center text-slate-400 space-y-2 bg-[#02140D] rounded-2xl border border-slate-800">
                    <Users className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                    <p className="text-xs font-bold">No friends added yet</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      Share your Friend Code with other players or enter their code to play together!
                    </p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="px-4 py-1.5 rounded-xl btn-emerald-glow text-[#02140D] font-black text-xs cursor-pointer inline-flex items-center gap-1.5 mt-2"
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
                        className="p-2.5 rounded-2xl bg-[#02140D] border border-slate-800 flex items-center justify-between shadow-sm hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar with live status dot */}
                          <div className="relative shrink-0">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar.gradient} border border-slate-700 flex items-center justify-center text-lg shadow`}
                            >
                              {avatar.icon}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#02140D] ${
                                isOnline
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                  : isInMatch
                                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                                  : 'bg-slate-600'
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
                              <span className="font-black text-xs text-white truncate">
                                {friend.displayName}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                                LVL {friend.level}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-slate-500 font-bold">{friend.friendCode}</span>
                              <span>•</span>
                              {isOnline && (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <span>In Lobby</span>
                                </span>
                              )}
                              {isInMatch && (
                                <span className="text-amber-300 font-bold flex items-center gap-1">
                                  <span>Playing {friend.currentMatchInfo?.mode || 'Match'}</span>
                                </span>
                              )}
                              {friend.presenceStatus === 'OFFLINE' && (
                                <span className="text-slate-500">Offline</span>
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
                                  ? 'btn-emerald-glow text-[#02140D] font-black shadow'
                                  : 'bg-slate-800/60 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                              }`}
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Invite</span>
                            </button>
                          ) : (
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-lg border ${
                                isOnline
                                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                  : isInMatch
                                  ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
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
                <div className="p-3.5 rounded-2xl bg-[#02140D] border border-slate-800 text-center space-y-2 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Your Player Friend Code
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
                      {profile.friendCode || 'DIGU-7482'}
                    </span>
                    <button
                      onClick={handleCopyMyCode}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
                      title="Copy Friend Code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Give this code to friends so they can add you directly to their table!
                  </p>
                </div>

                {/* Search & Send Request Form */}
                <form onSubmit={handleSendRequest} className="p-3.5 rounded-2xl bg-[#02140D] border border-slate-800 space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Enter Friend's Code</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={12}
                        value={friendCodeInput}
                        onChange={e => setFriendCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. DIGU-1104"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#010D08] border border-slate-700 focus:border-slate-400 text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!friendCodeInput.trim() || isLoading}
                      className="px-4 py-2 rounded-xl btn-emerald-glow text-[#02140D] font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {requestStatus && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                        requestStatus.success
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-800 text-rose-200'
                      }`}
                    >
                      {requestStatus.success ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
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
                  <div className="p-8 text-center text-slate-400 space-y-2 bg-[#02140D] rounded-2xl border border-slate-800">
                    <Inbox className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                    <p className="text-xs font-bold">No pending friend requests</p>
                    <p className="text-[10px] text-slate-500">
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
                        className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatar.gradient} border border-slate-700 flex items-center justify-center text-lg shadow`}
                          >
                            {avatar.icon}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white">{req.displayName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{req.friendCode}</div>
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
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer shadow active:scale-95"
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
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer active:scale-95"
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
          <div className="shrink-0 border-t border-emerald-950/60 pt-2.5 mt-2.5 flex justify-end">
            <button
              onClick={onClose}
              className="btn-emerald-glow px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-black cursor-pointer shadow-md text-[#02140D]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
