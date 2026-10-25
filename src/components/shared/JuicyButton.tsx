import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { useGameStore } from '../../store/useGameStore';

export interface JuicyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'emerald' | 'gold' | 'platinum' | 'vermilion' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'fab';
  hapticStyle?: ImpactStyle;
}

const VARIANT_CLASSES: Record<NonNullable<JuicyButtonProps['variant']>, string> = {
  emerald: 'btn-emerald-glow text-slate-950 font-black',
  gold: 'bg-gradient-to-r from-[#FDE68A] via-[#E5C378] to-[#B48D36] text-slate-950 font-black shadow-[0_0_15px_rgba(229,195,120,0.5)] border border-[#FEF08A]',
  platinum: 'btn-3d-platinum font-black',
  vermilion: 'btn-3d-vermilion font-black',
  dark: 'btn-3d-dark font-black',
};

const SIZE_CLASSES: Record<NonNullable<JuicyButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 rounded-xl text-xs',
  md: 'px-5 py-2.5 rounded-2xl text-sm',
  lg: 'px-8 py-3.5 rounded-3xl text-base',
  fab: 'px-8 py-4 sm:px-10 sm:py-5 rounded-3xl text-lg sm:text-xl',
};

export const JuicyButton: React.FC<JuicyButtonProps> = ({
  variant = 'gold',
  size = 'md',
  hapticStyle = ImpactStyle.Medium,
  onClick,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    try {
      if (useGameStore.getState().hapticsEnabled) {
        await Haptics.impact({ style: hapticStyle });
      }
    } catch {
      // Browser fallback (silent)
    }
    onClick?.(e);
  };

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={handleClick}
      className={`font-sans-clean tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer select-none ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
};
