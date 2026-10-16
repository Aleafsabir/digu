import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * useWakeLock:
 * Prevents mobile screens (Pixel Chrome, iOS Safari 16.4+, PWA) from timing out
 * or dimming during active gameplay at the Table.
 *
 * Handles:
 * - Screen Wake Lock API (navigator.wakeLock)
 * - iOS Safari & Android tab lifecycle (visibilitychange & pageshow / bfcache)
 * - Automatic re-acquisition when returning from lock or app switch
 * - Graceful fallback on unsupported platforms or Low Power Mode
 */
export function useWakeLock() {
  const currentScreen = useGameStore(state => state.currentScreen);
  const wakeLockRef = useRef<any>(null);
  const isAcquiringRef = useRef(false);

  useEffect(() => {
    // Only keep screen awake while actively on the gameplay Table
    const shouldKeepAwake = currentScreen === 'TABLE';

    const acquireLock = async () => {
      if (
        !shouldKeepAwake ||
        typeof navigator === 'undefined' ||
        !('wakeLock' in navigator) ||
        isAcquiringRef.current
      ) {
        return;
      }

      // If we already hold an active, non-released lock, no need to re-request
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
      }

      try {
        isAcquiringRef.current = true;
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');

        wakeLockRef.current.addEventListener('release', () => {
          // Sentinel was released (e.g. screen was turned off or tab hidden)
          wakeLockRef.current = null;
        });
      } catch {
        // Silently catch rejections (e.g. user revoked permission or Low Power Mode on iOS Safari)
        wakeLockRef.current = null;
      } finally {
        isAcquiringRef.current = false;
      }
    };

    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // Ignore release errors
        }
        wakeLockRef.current = null;
      }
    };

    if (shouldKeepAwake) {
      acquireLock();
    } else {
      releaseLock();
    }

    // iOS Safari & Android lifecycle event listeners
    const handleVisibilityOrPageshow = () => {
      if (document.visibilityState === 'visible' && shouldKeepAwake) {
        acquireLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrPageshow);
    window.addEventListener('pageshow', handleVisibilityOrPageshow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrPageshow);
      window.removeEventListener('pageshow', handleVisibilityOrPageshow);
      releaseLock();
    };
  }, [currentScreen]);
}
