import { create } from 'zustand';
import { Card } from '@game/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface CardFlightRequest {
  id: string;
  card: Card;
  fromAnchor?: string;
  fromPoint?: { x: number; y: number };
  toAnchor?: string;
  toPoint?: { x: number; y: number };
  isFaceDown?: boolean;
  flipToFaceUp?: boolean;
  flipToFaceDown?: boolean;
  isGinSlam?: boolean;
  durationMs?: number;
  rotation?: number;
  onComplete?: () => void;
}

interface AnimationStoreState {
  activeFlights: CardFlightRequest[];
  animationSpeedMultiplier: number;
  setAnimationSpeedMultiplier: (mult: number) => void;
  startFlight: (request: Omit<CardFlightRequest, 'id'>) => Promise<void>;
  removeFlight: (id: string) => void;
}

export const useAnimationStore = create<AnimationStoreState>((set, get) => ({
  activeFlights: [],
  animationSpeedMultiplier: 1.0,

  setAnimationSpeedMultiplier: (mult: number) => {
    set({ animationSpeedMultiplier: Math.max(0.5, Math.min(2.5, mult)) });
  },

  startFlight: (request: Omit<CardFlightRequest, 'id'>) => {
    return new Promise<void>((resolve) => {
      const id = `flight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let isSettled = false;

      const finish = () => {
        if (isSettled) return;
        isSettled = true;
        get().removeFlight(id);
        request.onComplete?.();
        resolve();
      };

      const multiplier = get().animationSpeedMultiplier || 1.0;
      const effectiveDuration = Math.round((request.durationMs || 320) / multiplier);

      const flight: CardFlightRequest = {
        ...request,
        id,
        durationMs: effectiveDuration,
        onComplete: finish,
      };

      // Native haptic tick on flight launch
      try {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      } catch {
        // Fallback for web
      }

      set((state) => ({
        activeFlights: [...state.activeFlights, flight],
      }));

      // Fallback safety timer: guaranteed resolution even if Framer Motion skips frame callbacks
      setTimeout(finish, effectiveDuration + 50);
    });
  },

  removeFlight: (id: string) => {
    set((state) => ({
      activeFlights: state.activeFlights.filter((f) => f.id !== id),
    }));
  },
}));
