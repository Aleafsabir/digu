import { useState, useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { TableSurface } from './components/table/TableSurface';
import { OrientationGuard } from './components/shared/OrientationGuard';
import { LaunchSplashScreen } from './components/screens/LaunchSplashScreen';
import { ModeSelectionScreen } from './components/screens/ModeSelectionScreen';
import { PlayTypeModal } from './components/screens/PlayTypeModal';
import { OnlineLobbyModal } from './components/screens/OnlineLobbyModal';
import { RulesConfirmationModal } from './components/screens/RulesConfirmationModal';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileEditModal } from './components/auth/ProfileEditModal';
import { RulesModal } from './components/shared/RulesModal';
import { Settings, X, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

export default function App() {
  const {
    currentScreen,
    pendingRules,
    actionError,
    setScreen,
    selectModeAndReview,
    selectPlayType,
    updatePendingRules,
    confirmAndStartMatch,
    clearError,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Auto-clear action error after 4 seconds
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => clearError(), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionError, clearError]);

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen h-[100dvh] max-h-screen bg-[#041710] text-[#FAF7F2] flex flex-col font-sans select-none overflow-hidden">
        {/* Landscape Orientation Enforcement & Rotate Modal */}
        <OrientationGuard />

      {/* Action Error Banner */}
      {actionError && (
        <div className="bg-rose-950/95 border-b border-rose-500 text-rose-200 text-xs px-4 py-1.5 text-center font-bold flex items-center justify-center gap-2 shadow-lg animate-bounce z-50 shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Screen 1: Launch Splash Screen */}
      {currentScreen === 'LAUNCH' && (
        <LaunchSplashScreen onFinish={() => setScreen('MODE_SELECT')} />
      )}

      {/* Screen 2: Game Mode Selection (Lobby) */}
      {currentScreen === 'MODE_SELECT' && (
        <ModeSelectionScreen
          onSelectMode={selectModeAndReview}
          onOpenRules={() => setShowRules(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenPrivateTable={() => {
            updatePendingRules({ playType: 'ONLINE', mode: 'TEAM_4P' });
            setScreen('ONLINE_LOBBY');
          }}
        />
      )}

      {/* Screen 2.5: Play Type Selection (VS AI vs Online) */}
      {currentScreen === 'PLAY_TYPE_SELECT' && (
        <>
          <ModeSelectionScreen
            onSelectMode={selectModeAndReview}
            onOpenRules={() => setShowRules(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <PlayTypeModal
            mode={pendingRules.mode}
            onSelectPlayType={selectPlayType}
            onBack={() => setScreen('MODE_SELECT')}
          />
        </>
      )}

      {/* Screen 2.6: Online Multiplayer Lobby Radar */}
      {currentScreen === 'ONLINE_LOBBY' && (
        <>
          <ModeSelectionScreen
            onSelectMode={selectModeAndReview}
            onOpenRules={() => setShowRules(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <OnlineLobbyModal
            pendingRules={pendingRules}
            onPlayVSAI={() => selectPlayType('VS_AI')}
            onBack={() => setScreen('PLAY_TYPE_SELECT')}
          />
        </>
      )}

      {/* Screen 3: Rules & Stakes Confirmation */}
      {currentScreen === 'RULES_CONFIRM' && (
        <>
          <ModeSelectionScreen
            onSelectMode={selectModeAndReview}
            onOpenRules={() => setShowRules(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <RulesConfirmationModal
            pendingRules={pendingRules}
            onUpdateRules={updatePendingRules}
            onConfirm={confirmAndStartMatch}
            onBack={() => setScreen('PLAY_TYPE_SELECT')}
          />
        </>
      )}

      {/* Screen 4: Active Gameplay (Headerless Stadium Table) */}
      {currentScreen === 'TABLE' && <TableSurface />}

      {/* Settings Modal (Lobby level) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#12161a] border-0 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-sm w-full animate-in zoom-in-95 text-center">
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-sm text-[#FAF7F2] uppercase tracking-wider">
                  Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-left">
              <div className="bg-[#171c22] px-3.5 py-2.5 rounded-2xl border-0 flex items-center justify-between">
                <span className="text-neutral-400 font-bold">Platform</span>
                <span className="text-amber-300 font-mono font-bold">Thaasbai v0.1.0</span>
              </div>
              <div className="bg-[#171c22] px-3.5 py-2.5 rounded-2xl border-0 flex items-center justify-between">
                <span className="text-neutral-400 font-bold">Orientation</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  📱 Landscape Lock
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Cheat Sheet Modal (Graphic Formulas, Zero Paragraphs) */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Authentication & Profile Modals */}
      <AuthModal />
      <ProfileEditModal />
    </div>
  </ErrorBoundary>
  );
}
