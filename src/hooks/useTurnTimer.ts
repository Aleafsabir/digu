import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const TURN_DURATION_SECONDS = 30;

/**
 * useTurnTimer:
 * Manages the 30-second casual turn clock for the Human player (Seat 0).
 *
 * Features:
 * - 30-second countdown for human turn in AWAIT_DRAW / AWAIT_ACTION.
 * - Haptic pulse at 5 seconds remaining.
 * - Automated away-turn execution (up to 2 allowed, 3rd forfeits).
 * - iOS Safari & Android lifecycle reconciliation (visibilitychange & pageshow / bfcache):
 *   Checks Date.now() timestamp delta immediately upon phone unlock or tab foregrounding!
 */
export function useTurnTimer() {
  const currentScreen = useGameStore(state => state.currentScreen);
  const activePlayerIndex = useGameStore(state => state.gameState.activePlayerIndex);
  const phase = useGameStore(state => state.gameState.phase);
  const isForfeited = useGameStore(state => state.isForfeitedDueToInactivity);
  const turnStartedAt = useGameStore(state => state.turnStartedAt);
  const autoPlayAwayTurn = useGameStore(state => state.autoPlayAwayTurn);

  const isHumanTurn =
    currentScreen === 'TABLE' &&
    activePlayerIndex === 0 &&
    (phase === 'AWAIT_DRAW' || phase === 'AWAIT_ACTION') &&
    !isForfeited;

  const [remainingSeconds, setRemainingSeconds] = useState(TURN_DURATION_SECONDS);
  const hasVibratedRef = useRef(false);

  useEffect(() => {
    if (!isHumanTurn) {
      setRemainingSeconds(TURN_DURATION_SECONDS);
      hasVibratedRef.current = false;
      return;
    }

    const effectiveStart = turnStartedAt || Date.now();

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - effectiveStart) / 1000);
      const left = Math.max(0, TURN_DURATION_SECONDS - elapsed);
      setRemainingSeconds(left);

      // Light haptic warning at 5 seconds remaining
      if (left === 5 && !hasVibratedRef.current) {
        hasVibratedRef.current = true;
        try {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        } catch {
          // WebKit fallback
        }
      }

      if (left <= 0) {
        autoPlayAwayTurn();
      }
    };

    // Immediate check
    updateTimer();

    // 1-second interval while tab is active
    const interval = setInterval(updateTimer, 1000);

    // iOS Safari bfcache & Android foreground wake reconciliation
    const handleReconciliation = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleReconciliation);
    window.addEventListener('pageshow', handleReconciliation);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleReconciliation);
      window.removeEventListener('pageshow', handleReconciliation);
    };
  }, [isHumanTurn, turnStartedAt, autoPlayAwayTurn]);

  return {
    remainingSeconds: isHumanTurn ? remainingSeconds : TURN_DURATION_SECONDS,
    totalSeconds: TURN_DURATION_SECONDS,
    isHumanTurn,
  };
}
