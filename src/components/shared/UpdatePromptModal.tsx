import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppUpdateInfo, APP_VERSION_CONFIG } from '../../config/versionConfig';
import { dismissUpdate, downloadAndInstallUpdate } from '../../services/updateService';
import { JuicyButton } from './JuicyButton';

interface UpdatePromptModalProps {
  updateInfo: AppUpdateInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    downloadAndInstallUpdate(updateInfo.downloadUrl);
    setTimeout(() => {
      setIsDownloading(false);
      if (!updateInfo.isMandatory) {
        onClose();
      }
    }, 2000);
  };

  const handleDismiss = () => {
    if (updateInfo.isMandatory) return;
    dismissUpdate(updateInfo.versionName);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none font-sans-clean">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-gradient-to-b from-[#170b09] via-[#0d0605] to-[#0d0605] rounded-3xl p-5 sm:p-6 max-w-sm w-full text-center relative border-2 border-[#301a14] shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(200,75,49,0.2)]"
        >
          {/* Close button (Hidden if mandatory) */}
          {!updateInfo.isMandatory && (
            <button
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 text-[#e5c378]/60 hover:text-white p-1 rounded-full cursor-pointer transition border-0"
              aria-label="Dismiss update"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Centerpiece Icon Crest */}
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 rounded-2xl bg-[#c84b31]/20 blur-md animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c84b31] via-[#170b09] to-[#0d0605] border-2 border-[#E5C378] flex items-center justify-center text-3xl font-black font-thaana text-[#E5C378] shadow-lg relative z-10">
              ޑ
            </div>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#e5c378] to-[#b48d36] text-[#0d0605] font-mono text-[9px] font-black shadow-md z-20">
              NEW
            </span>
          </div>

          {/* Header Title */}
          <h2 className="text-lg sm:text-xl font-serif font-black text-[#f7f0ea] tracking-tight mb-1">
            New Update Available!
          </h2>

          {/* Version Transition Pills */}
          <div className="flex items-center justify-center gap-2 mb-3 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[#f7f0ea]/70 font-mono text-[10px]">
              v{APP_VERSION_CONFIG.versionName}
            </span>
            <span className="text-[#e5c378] font-bold">➔</span>
            <span className="px-2 py-0.5 rounded-md bg-[#e5c378]/15 border border-[#e5c378]/40 text-[#e5c378] font-mono font-bold text-[10px]">
              v{updateInfo.versionName} (Build {updateInfo.versionCode})
            </span>
          </div>

          {/* Mandatory Warning Banner */}
          {updateInfo.isMandatory && (
            <div className="mb-3 p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[10px] font-bold flex items-center gap-1.5 text-left">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>This update is required to continue playing multiplayer tables.</span>
            </div>
          )}

          {/* Release Notes List */}
          <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 text-left mb-4 space-y-1.5 text-xs">
            <div className="text-[10px] uppercase font-black text-[#E5C378] tracking-wider mb-1 flex items-center justify-between">
              <span>What's New in v{updateInfo.versionName}:</span>
              <span className="text-[#f7f0ea]/50 font-mono text-[9px]">{updateInfo.releaseDate}</span>
            </div>
            <ul className="space-y-1 text-[#f7f0ea]/80 text-[11px] leading-relaxed max-h-36 overflow-y-auto pr-1">
              {updateInfo.releaseNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#e5c378] shrink-0 mt-0.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <JuicyButton
              variant="gold"
              size="md"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full shadow-lg"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Opening Download...' : 'Download & Install APK'}</span>
            </JuicyButton>

            {!updateInfo.isMandatory && (
              <button
                onClick={handleDismiss}
                className="w-full py-2 rounded-xl text-xs font-bold text-[#e5c378]/60 hover:text-white transition cursor-pointer border-0"
              >
                Remind Me Later
              </button>
            )}
          </div>

          <div className="text-[9.5px] text-[#f7f0ea]/40 font-mono mt-2.5">
            Direct from GitHub Releases • Safe & Verified APK
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
