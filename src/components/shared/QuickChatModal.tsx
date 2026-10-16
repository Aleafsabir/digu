import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Smile } from 'lucide-react';
import { QUICK_CHAT_PHRASES, QUICK_CHAT_EMOJIS } from '../../config/quickChatConfig';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface QuickChatModalProps {
  isOpen: boolean;
  initialTab?: 'chat' | 'emoji';
  onClose: () => void;
  onSendReaction: (text?: string, emoji?: string) => void;
}

export const QuickChatModal: React.FC<QuickChatModalProps> = ({
  isOpen,
  initialTab = 'chat',
  onClose,
  onSendReaction,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'emoji'>(initialTab);

  if (!isOpen) return null;

  const handleSelectText = async (phraseText: string) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    onSendReaction(phraseText, undefined);
    onClose();
  };

  const handleSelectEmoji = async (emojiChar: string) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    onSendReaction(undefined, emojiChar);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs select-none font-sans-clean">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="w-full max-w-sm bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-slate-700 rounded-3xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-3"
        >
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-emerald-950 pb-2">
            <div className="flex items-center gap-1.5 bg-[#02140D] border border-slate-800 p-1 rounded-2xl shadow-inner">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border-0 ${
                  activeTab === 'chat'
                    ? 'btn-3d-platinum text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('emoji')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border-0 ${
                  activeTab === 'emoji'
                    ? 'btn-3d-platinum text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Emojis</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer transition border-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Chat Phrases List */}
          {activeTab === 'chat' && (
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {QUICK_CHAT_PHRASES.map(phrase => (
                <button
                  key={phrase.id}
                  onClick={() => handleSelectText(phrase.text)}
                  className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-[#02140D] hover:bg-[#031B11] border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group active:scale-98 cursor-pointer"
                >
                  <span className="text-xs font-bold text-white group-hover:text-[#F1F5F9]">
                    {phrase.text}
                  </span>
                  {phrase.translation && (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-300 italic ml-2">
                      {phrase.translation}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Emojis Grid */}
          {activeTab === 'emoji' && (
            <div className="grid grid-cols-4 gap-2 py-2">
              {QUICK_CHAT_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleSelectEmoji(emoji)}
                  className="h-14 rounded-2xl bg-[#02140D] hover:bg-[#031B11] border border-slate-800 flex items-center justify-center text-2xl transition active:scale-90 hover:scale-105 cursor-pointer shadow-md"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
