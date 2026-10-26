import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface ViewportInfo {
  width: number;
  height: number;
  aspectRatio: number;
  isDenseMode: boolean; // true when visible height < 360px (e.g. iPhone Safari with browser toolbars)
  isIOS: boolean;
  isNative: boolean;
  isStandalone: boolean; // PWA home screen mode
  showIosPwaPrompt: boolean; // iOS Safari non-standalone
}

export function useResponsiveViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 896,
        height: 414,
        aspectRatio: 2.16,
        isDenseMode: false,
        isIOS: false,
        isNative: false,
        isStandalone: false,
        showIosPwaPrompt: false,
      };
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isNative = Capacitor.isNativePlatform();
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const isDense = h < 360 || (h < 390 && w / h > 2.2);

    return {
      width: w,
      height: h,
      aspectRatio: w / (h || 1),
      isDenseMode: isDense,
      isIOS,
      isNative,
      isStandalone,
      showIosPwaPrompt: isIOS && !isNative && !isStandalone,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isNative = Capacitor.isNativePlatform();
      const isStandalone =
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      const isDense = h < 360 || (h < 390 && w / h > 2.2);

      setViewport({
        width: w,
        height: h,
        aspectRatio: w / (h || 1),
        isDenseMode: isDense,
        isIOS,
        isNative,
        isStandalone,
        showIosPwaPrompt: isIOS && !isNative && !isStandalone,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewport;
}
