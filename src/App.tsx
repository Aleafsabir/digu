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
import { SettingsModal } from './components/shared/SettingsModal';
import { InactivityForfeitModal } from './components/shared/InactivityForfeitModal';
import { AlertCircle, Clock } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useWakeLock } from './hooks/useWakeLock';

export default function App() {
  // Mobile Screen Timeout Prevention (Screen Wake Lock API + iOS Safari Lifecycle)
  useWakeLock();

  const {
    currentScreen,
    pendingRules,
    actionError,
    awayToastMessage,
    isForfeitedDueToInactivity,
    tablePot,
    tableBuyIn,
    setScreen,
    selectModeAndReview,
    selectPlayType,
    updatePendingRules,
    confirmAndStartMatch,
    clearError,
    clearAwayToast,
    exitToLobby,
    restoreActiveMatchSession,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Restore active match session seamlessly on app load / mobile reopen
  useEffect(() => {
    restoreActiveMatchSession();
  }, [restoreActiveMatchSession]);

  // Auto-clear away turn toast notification after 4.5 seconds
  useEffect(() => {
    if (awayToastMessage) {
      const timer = setTimeout(() => clearAwayToast(), 4500);
      return () => clearTimeout(timer);
    }
  }, [awayToastMessage, clearAwayToast]);

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

      {/* Settings Modal (Appearance, System & Account) */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Rules Cheat Sheet Modal (Graphic Formulas, Zero Paragraphs) */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Authentication & Profile Modals */}
      <AuthModal />
      <ProfileEditModal />

      {/* Away Turn Toast Notification */}
      {awayToastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0E1B17]/95 border border-amber-500/60 text-amber-200 text-xs px-4 py-2 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in slide-in-from-top duration-300">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>{awayToastMessage}</span>
        </div>
      )}

      {/* Inactivity Forfeit Modal */}
      {isForfeitedDueToInactivity && (
        <InactivityForfeitModal
          onReturnToLobby={exitToLobby}
          tablePot={tablePot}
          tableBuyIn={tableBuyIn}
        />
      )}
    </div>
  </ErrorBoundary>
  );
}
