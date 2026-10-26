import { useState, useEffect } from 'react';
import { useGameStore, safeSaveSession } from './store/useGameStore';
import { TableSurface } from './components/table/TableSurface';
import { DhihaehTableSurface } from './components/dhihaeh/DhihaehTableSurface';
import { BondiTableSurface } from './components/bondi/BondiTableSurface';
import { DhihaehSetupModal } from './components/screens/DhihaehSetupModal';
import { BondiSetupModal } from './components/screens/BondiSetupModal';
import { useDhihaehStore } from './store/useDhihaehStore';
import { useBondiStore } from './store/useBondiStore';
import { OrientationGuard } from './components/shared/OrientationGuard';
import { LaunchSplashScreen } from './components/screens/LaunchSplashScreen';
import { AccountGatewayScreen } from './components/screens/AccountGatewayScreen';
import { MainLobbyScreen } from './components/screens/MainLobbyScreen';
import { ModeSelectionScreen } from './components/screens/ModeSelectionScreen';
import { PlayTypeModal } from './components/screens/PlayTypeModal';
import { OnlineLobbyModal } from './components/screens/OnlineLobbyModal';
import { RulesConfirmationModal } from './components/screens/RulesConfirmationModal';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileEditModal } from './components/auth/ProfileEditModal';
import { CloudConflictModal } from './components/auth/CloudConflictModal';
import { RulesModal } from './components/shared/RulesModal';
import { SettingsModal } from './components/shared/SettingsModal';
import { FriendsModal } from './components/social/FriendsModal';
import { MatchInviteToast } from './components/social/MatchInviteToast';
import { InactivityForfeitModal } from './components/shared/InactivityForfeitModal';
import { UpdatePromptModal } from './components/shared/UpdatePromptModal';
import { checkForAppUpdate } from './services/updateService';
import { CloudSyncService } from './services/cloudSyncService';
import { AlertCircle, Clock } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useWakeLock } from './hooks/useWakeLock';
import { useSocialStore } from './store/useSocialStore';
import { useAuthStore } from './store/useAuthStore';
import { MusicManager } from './utils/audioEffects';

export default function App() {
  // Mobile Screen Timeout Prevention (Screen Wake Lock API + iOS Safari Lifecycle)
  useWakeLock();

  const {
    currentScreen,
    activeGame,
    pendingRules,
    actionError,
    awayToastMessage,
    isForfeitedDueToInactivity,
    tablePot,
    tableBuyIn,
    updateInfo,
    showUpdateModal,
    setUpdateInfo,
    setShowUpdateModal,
    setScreen,
    selectModeAndReview,
    selectPlayType,
    updatePendingRules,
    confirmAndStartMatch,
    clearError,
    clearAwayToast,
    exitToLobby,
    restoreActiveMatchSession,
    setActiveGame,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDhihaehSetup, setShowDhihaehSetup] = useState(false);
  const [showBondiSetup, setShowBondiSetup] = useState(false);
  const [lobbyInitialTab, setLobbyInitialTab] = useState<'CREATE_ROOM' | 'JOIN_ROOM' | 'QUICK_MATCH'>('CREATE_ROOM');

  const {
    profile,
    conflictData,
    resolveConflict,
    setConflictData,
  } = useAuthStore();
  const { isFriendsModalOpen, setFriendsModalOpen, initPresence } = useSocialStore();

  // Flush any pending offline progression changes to cloud server
  useEffect(() => {
    CloudSyncService.flushPendingSync();
  }, []);

  // Connect to Real-Time Presence & Invitation WebSocket
  useEffect(() => {
    if (profile?.id && profile?.displayName) {
      const cleanup = initPresence(
        profile.id,
        profile.displayName,
        profile.avatarId,
        profile.friendCode,
        profile.level
      );
      return cleanup;
    }
  }, [profile?.id, profile?.displayName, profile?.avatarId, profile?.friendCode, profile?.level, initPresence]);

  // Restore active match session seamlessly on app load / mobile reopen
  useEffect(() => {
    restoreActiveMatchSession();
  }, [restoreActiveMatchSession]);

  // Synchronous Mobile Lifecycle State Flush (Background / Lockscreen / App Minimization)
  useEffect(() => {
    const handleLifecycleFlush = () => {
      const state = useGameStore.getState();
      if (state.currentScreen === 'TABLE' && state.gameState) {
        safeSaveSession({
          gameState: state.gameState,
          handCards: state.handCards,
          pendingRules: state.pendingRules,
          roundHistory: state.roundHistory,
          tablePot: state.tablePot,
          tableBuyIn: state.tableBuyIn,
          consecutiveMissedTurns: state.consecutiveMissedTurns,
          turnStartedAt: state.turnStartedAt,
          savedAt: Date.now(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleLifecycleFlush);
    window.addEventListener('pagehide', handleLifecycleFlush);
    return () => {
      document.removeEventListener('visibilitychange', handleLifecycleFlush);
      window.removeEventListener('pagehide', handleLifecycleFlush);
    };
  }, []);

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

  // Lyria Background Music synchronization across game screens
  useEffect(() => {
    if (currentScreen === 'TABLE') {
      MusicManager.playTrack('table');
    } else if (currentScreen !== 'LAUNCH') {
      MusicManager.playTrack('lobby');
    }
  }, [currentScreen]);

  // Check for app updates on launch (debounced / 4h cooldown managed)
  useEffect(() => {
    checkForAppUpdate().then(res => {
      if (res.hasUpdate && res.updateInfo) {
        setUpdateInfo(res.updateInfo);
        setShowUpdateModal(true);
      }
    });
  }, [setUpdateInfo, setShowUpdateModal]);

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen h-[100dvh] max-h-screen bg-[#0d0605] text-[#f7f0ea] flex flex-col font-sans select-none overflow-hidden">
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
        <LaunchSplashScreen
          onFinish={() => {
            const hasExistingProfile = profile?.id && profile?.displayName;
            const hasOnboarded = localStorage.getItem('holhuashi_onboarded') === 'true';
            if (!hasOnboarded && (!hasExistingProfile || profile.loginProvider === 'GUEST')) {
              localStorage.setItem('holhuashi_onboarded', 'true');
              setScreen('ACCOUNT_GATEWAY');
            } else {
              setScreen('MAIN_LOBBY');
            }
          }}
        />
      )}

      {/* Screen 2: Account Gateway Onboarding */}
      {currentScreen === 'ACCOUNT_GATEWAY' && (
        <AccountGatewayScreen onContinue={() => setScreen('MAIN_LOBBY')} />
      )}

      {/* Screen 3: Main Lobby (Model 1: Supercell Hero 1-Tap Hub) */}
      {currentScreen === 'MAIN_LOBBY' && (
        <MainLobbyScreen
          onStartDiguMatch={(mode, playType) => {
            setActiveGame('DIGU');
            if (playType === 'ONLINE') {
              updatePendingRules({ mode, playType: 'ONLINE' });
              setLobbyInitialTab('QUICK_MATCH');
              setScreen('ONLINE_LOBBY');
            } else {
              useGameStore.getState().startDirectMatch(mode, 'VS_AI');
            }
          }}
          onStartDhihaehMatch={(variant, targetScore) => {
            setActiveGame('DHIHAEH');
            useDhihaehStore.getState().startMatch(variant, targetScore);
            setScreen('TABLE');
          }}
          onStartBondiMatch={(variant, playerCount) => {
            setActiveGame('BONDI');
            useBondiStore.getState().startMatch(variant, playerCount);
            setScreen('TABLE');
          }}
          onOpenPrivateTable={(game) => {
            setActiveGame(game);
            updatePendingRules({ playType: 'ONLINE', mode: 'TEAM_4P' });
            setLobbyInitialTab('CREATE_ROOM');
            setScreen('ONLINE_LOBBY');
          }}
          onSelectGame={(game) => {
            setActiveGame(game);
            if (game === 'DIGU') {
              setScreen('MODE_SELECT');
            } else if (game === 'DHIHAEH') {
              setShowDhihaehSetup(true);
            } else if (game === 'BONDI') {
              setShowBondiSetup(true);
            }
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenRules={() => setShowRules(true)}
          onSwitchAccount={() => setScreen('ACCOUNT_GATEWAY')}
        />
      )}

      {/* Screen 4: Digu Sub-Lobby (Mode Selection) */}
      {currentScreen === 'MODE_SELECT' && (
        <ModeSelectionScreen
          onSelectMode={selectModeAndReview}
          onOpenRules={() => setShowRules(true)}
          onOpenSettings={() => setShowSettings(true)}
          onBackToMainLobby={() => setScreen('MAIN_LOBBY')}
          onOpenPrivateTable={() => {
            updatePendingRules({ playType: 'ONLINE', mode: 'TEAM_4P' });
            setLobbyInitialTab('CREATE_ROOM');
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
            onBackToMainLobby={() => setScreen('MAIN_LOBBY')}
          />
          <PlayTypeModal
            mode={pendingRules.mode}
            onSelectPlayType={type => {
              if (type === 'ONLINE') {
                setLobbyInitialTab('QUICK_MATCH');
              }
              selectPlayType(type);
            }}
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
            onBackToMainLobby={() => setScreen('MAIN_LOBBY')}
          />
          <OnlineLobbyModal
            pendingRules={pendingRules}
            initialTab={lobbyInitialTab}
            onPlayVSAI={() => selectPlayType('VS_AI')}
            onBack={() => setScreen(lobbyInitialTab === 'CREATE_ROOM' ? 'MODE_SELECT' : 'PLAY_TYPE_SELECT')}
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
            onBackToMainLobby={() => setScreen('MAIN_LOBBY')}
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
      {currentScreen === 'TABLE' && (
        <>
          {activeGame === 'DIGU' && <TableSurface />}
          {activeGame === 'DHIHAEH' && <DhihaehTableSurface />}
          {activeGame === 'BONDI' && <BondiTableSurface />}
        </>
      )}

      {/* Dhihaeh Match Setup Modal */}
      <DhihaehSetupModal
        isOpen={showDhihaehSetup}
        onClose={() => setShowDhihaehSetup(false)}
        onStart={(variant, targetScore) => {
          setShowDhihaehSetup(false);
          setActiveGame('DHIHAEH');
          useDhihaehStore.getState().startMatch(variant, targetScore);
          setScreen('TABLE');
        }}
      />

      {/* Bondi Match Setup Modal */}
      <BondiSetupModal
        isOpen={showBondiSetup}
        onClose={() => setShowBondiSetup(false)}
        onStart={(variant, playerCount) => {
          setShowBondiSetup(false);
          setActiveGame('BONDI');
          useBondiStore.getState().startMatch(variant, playerCount);
          setScreen('TABLE');
        }}
      />

      {/* Settings Modal (Appearance, System & Account) */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Friends & Social Modal */}
      <FriendsModal isOpen={isFriendsModalOpen} onClose={() => setFriendsModalOpen(false)} />

      {/* Real-Time Match Invitation Floating Toast */}
      <MatchInviteToast />

      {/* Rules Cheat Sheet Modal (Graphic Formulas, Zero Paragraphs) */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Authentication & Profile Modals */}
      <AuthModal />
      <ProfileEditModal />

      {/* Cloud Account Conflict Resolution Modal */}
      {conflictData && (
        <CloudConflictModal
          isOpen={!!conflictData}
          cloudProfile={conflictData.cloud}
          localProfile={conflictData.local}
          onResolve={resolveConflict}
          onCancel={() => setConflictData(null)}
        />
      )}

      {/* Away Turn Toast Notification */}
      {awayToastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#170b09]/95 border border-[#e5c378]/60 text-[#e5c378] text-xs px-4 py-2 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in slide-in-from-top duration-300">
          <Clock className="w-4 h-4 text-[#e5c378] shrink-0 animate-pulse" />
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

      {/* In-App APK Auto-Update Prompt Modal */}
      {updateInfo && (
        <UpdatePromptModal
          isOpen={showUpdateModal}
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  </ErrorBoundary>
  );
}
