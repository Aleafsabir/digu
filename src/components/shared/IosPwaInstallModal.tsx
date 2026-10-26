import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface IosPwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosPwaInstallModal: React.FC<IosPwaInstallModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#e5c378] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#f7f0ea] relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#301a14] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#e5c378]" />
                <h3 className="font-black text-xs sm:text-sm text-[#e5c378] uppercase tracking-wider font-serif-luxury">
                  Play Fullscreen on iPhone
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition active:scale-95 border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#f7f0ea]/80 leading-relaxed mb-4">
              Apple Safari disables in-browser fullscreen on iPhones. Add Digu to your <strong>Home Screen</strong> in 2 taps for <strong>100% borderless gameplay with zero browser bars</strong>:
            </p>

            {/* Steps */}
            <div className="space-y-2.5 mb-5 text-xs font-medium">
              <div className="flex items-center gap-3 bg-[#0d0605] p-2.5 rounded-2xl border border-[#301a14]">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c84b31] to-[#8f2c18] flex items-center justify-center font-black text-white shrink-0 text-sm shadow">
                  1
                </div>
                <div className="flex items-center gap-1.5 flex-1 text-left">
                  <span>Tap Safari's <strong>Share</strong> button</span>
                  <span className="p-1 rounded bg-white/10 text-[#e5c378] inline-flex items-center justify-center">
                    <Share className="w-3.5 h-3.5" />
                  </span>
                  <span>at bottom of screen.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#0d0605] p-2.5 rounded-2xl border border-[#301a14]">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e5c378] to-[#b48d36] flex items-center justify-center font-black text-[#0d0605] shrink-0 text-sm shadow">
                  2
                </div>
                <div className="flex items-center gap-1.5 flex-1 text-left">
                  <span>Scroll down &amp; tap</span>
                  <span className="p-1 rounded bg-white/10 text-[#e5c378] inline-flex items-center justify-center font-bold">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </span>
                  <span><strong>"Add to Home Screen"</strong>.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#0d0605] p-2.5 rounded-2xl border border-[#301a14]">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white shrink-0 text-sm shadow">
                  3
                </div>
                <span className="text-left">
                  Launch <strong>Digu</strong> from your Home Screen for full edge-to-edge view!
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black text-xs uppercase tracking-wider shadow active:scale-95 transition cursor-pointer border-0"
            >
              Continue Playing
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
