export type VisualTheme = 'tournoi' | 'sultan' | 'holhuashi' | 'risograph' | 'nocturne' | 'swiss';

export interface MeldHighlightMeta {
  ringClass: string;
  badgeClass: string;
  containerClass: string;
  pipClass: string;
}

export interface ThemeConfig {
  id: VisualTheme;
  name: string;
  subtitle: string;
  badge: string;

  // Outer Table & Frame Styling
  tableWrapperClass: string;
  tableBevelClass: string;
  tableFeltClass: string;
  feltTextureClass: string;
  watermarkText: string;
  watermarkClass: string;

  // Typography
  fontHeader: string;
  fontBody: string;
  fontCard: string;
  fontNumber: string;

  // Placard (Stakes scorecard)
  placardClass: string;
  placardHeaderBorder: string;

  // Top Bar HUD & Buttons
  hudPillClass: string;
  menuButtonClass: string;
  actionButtonClass: string;

  // Card Appearance
  cardFaceClass: string;
  cardBackClass: string;
  cardBackInnerClass: string;
  cardBackLabelClass: string;
  redSuitClass: string;
  blackSuitClass: string;
  selectedCardRing: string;

  // Melds: Highlighting
  getMeldHighlight: (
    colorKey: string,
    meldIndex: number,
    meldType?: 'SET' | 'RUN'
  ) => MeldHighlightMeta;
}

export const THEME_CONFIGS: Record<VisualTheme, ThemeConfig> = {
  // MASTER: TOURNOI EMERALD & TITANIUM SILVER
  tournoi: {
    id: 'tournoi',
    name: 'Tournoi Emerald',
    subtitle: 'Platinum Ice & Titanium Silver',
    badge: 'CASUAL',

    // Sleek Architectural Border with Subtle Radiance
    tableWrapperClass:
      'bg-gradient-to-b from-[#042618] via-[#021A10] to-[#010D08] border-4 border-[#0F3D26] shadow-[0_25px_60px_rgba(0,0,0,0.95)]',
    tableBevelClass:
      'bg-[#02140D] border border-slate-700/60 shadow-inner',
    tableFeltClass:
      'bg-gradient-to-b from-[#042618] via-[#021A10] to-[#010D08] border border-emerald-900/40 shadow-inner',
    feltTextureClass: 'texture-velvet',
    watermarkText: 'ތާސްބައި',
    watermarkClass:
      'font-sans-clean text-[#05D59A]/10 text-6xl sm:text-8xl font-black tracking-widest',

    fontHeader: 'font-sans-clean',
    fontBody: 'font-sans-clean',
    fontCard: 'font-sans-clean',
    fontNumber: 'font-mono',

    // Titanium Score Placard
    placardClass:
      'bg-[#02140D]/95 border border-slate-700/80 shadow-lg text-white backdrop-blur-md',
    placardHeaderBorder: 'border-b border-slate-700/50',

    hudPillClass: 'bg-[#02140D]/95 text-[#F1F5F9] border border-slate-400/60 shadow-md backdrop-blur-md',
    menuButtonClass:
      'bg-[#02140D]/90 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md',
    actionButtonClass:
      'btn-3d-vermilion',

    // High-Contrast Clean Ivory Card Face
    cardFaceClass:
      'bg-[#FCFCFA] border-2 border-slate-300 shadow-2xl text-[#1A1715]',
    cardBackClass:
      'bg-gradient-to-br from-[#06291B] to-[#02140D] border border-[#05D59A]/40 shadow-2xl',
    cardBackInnerClass:
      'border border-[#05D59A]/20 bg-[#02140D]',
    cardBackLabelClass: 'text-[#05D59A] font-sans-clean font-black tracking-widest',
    redSuitClass: 'text-[#DC2626]',
    blackSuitClass: 'text-[#1A1715]',
    selectedCardRing: 'shadow-[0_20px_30px_-5px_rgba(255,255,255,0.4)] border-2 border-white',

    // Melds: Aquamarine (Runs) & Crisp Iris (Sets)
    getMeldHighlight: (_colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET';
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-[#818CF8] text-white font-black shadow-sm',
          pipClass: 'bg-[#818CF8] shadow-[0_0_8px_rgba(129,140,248,0.9)]',
          containerClass:
            'bg-gradient-to-b from-[#EEF2FF] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-[#818CF8] shadow-[0_6px_20px_rgba(129,140,248,0.3)]',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-[#00A896] text-white font-black shadow-sm',
        pipClass: 'bg-[#00A896] shadow-[0_0_8px_rgba(0,168,150,0.9)]',
        containerClass:
          'bg-gradient-to-b from-[#F0FDFA] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-[#00A896] shadow-[0_6px_20px_rgba(0,168,150,0.3)]',
      };
    },
  },
  // 0. SULTAN'S VELVET: Old-Money Casino Royale, Deep Emerald Velvet & Padded Mahogany
  sultan: {
    id: 'sultan',
    name: "Sultan's Velvet",
    subtitle: 'Casino Royale & Emerald Velvet',
    badge: 'ROYALE',

    // Heavy Padded Mahogany Rail with Brass Accents
    tableWrapperClass:
      'bg-gradient-to-b from-[#211309] to-[#0e0703] border-4 sm:border-6 border-[#3d2311] shadow-[0_25px_60px_rgba(0,0,0,0.98)]',
    tableBevelClass:
      'bg-[#180e07] border border-amber-600/40 shadow-inner',
    // Rich Deep Emerald Velvet Felt
    tableFeltClass:
      'bg-gradient-to-b from-[#062419] via-[#041710] to-[#020d09] border border-emerald-900/40 shadow-inner',
    feltTextureClass: 'texture-velvet',
    watermarkText: 'ތާސްބައި',
    watermarkClass:
      'font-cinzel text-emerald-400/10 text-6xl sm:text-8xl font-black tracking-widest',

    fontHeader: 'font-cinzel',
    fontBody: 'font-sans-clean',
    fontCard: 'font-cinzel',
    fontNumber: 'font-cinzel',

    // Gilded Brass Placard
    placardClass:
      'bg-gradient-to-b from-[#1c120a]/95 to-[#0d0704]/95 border-2 border-amber-500/70 shadow-2xl text-amber-100',
    placardHeaderBorder: 'border-b border-amber-500/30',

    hudPillClass: 'bg-[#150a04]/90 text-amber-300 border-0 shadow-md',
    menuButtonClass:
      'bg-[#1a0e06]/90 hover:bg-[#2a170b] border-0 text-amber-300',
    actionButtonClass:
      'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:brightness-110 text-stone-950 font-black border-0 shadow-lg',

    // Aristocrat Ivory Card Face
    cardFaceClass:
      'bg-[#F9F7EE] border border-amber-900/30 shadow-2xl text-[#1a1815]',
    cardBackClass:
      'bg-gradient-to-br from-[#58111A] to-[#2A050A] border-2 border-amber-400/80 shadow-2xl',
    cardBackInnerClass:
      'border border-amber-400/40 bg-[#400B12]',
    cardBackLabelClass: 'text-amber-300 font-cinzel font-black tracking-widest',
    redSuitClass: 'text-[#B91C1C]',
    blackSuitClass: 'text-[#18181B]',
    selectedCardRing: 'shadow-[0_15px_30px_rgba(251,191,36,0.5)] border-0',

    // Melds: Highlighting with Distinct SET / RUN Accents & Opaque Parchment
    getMeldHighlight: (colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET' || colorKey === 'amber';
      const isEmerald = colorKey === 'emerald' || colorKey === 'green';

      if (isEmerald) {
        return {
          ringClass: '',
          badgeClass: 'bg-emerald-500 text-stone-950 font-black shadow-sm',
          pipClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]',
          containerClass:
            'bg-gradient-to-b from-[#ECFDF5] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-emerald-400 shadow-[0_6px_20px_rgba(52,211,153,0.35)]',
        };
      }
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-amber-400 text-stone-950 font-black shadow-sm',
          pipClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)]',
          containerClass:
            'bg-gradient-to-b from-[#FFFBEB] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-amber-400 shadow-[0_6px_20px_rgba(245,158,11,0.35)]',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-sky-500 text-white font-black shadow-sm',
        pipClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.95)]',
        containerClass:
          'bg-gradient-to-b from-[#F0F9FF] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-sky-400 shadow-[0_6px_20px_rgba(56,189,248,0.35)]',
      };
    },
  },

  // 1. HOLHUASHI CRAFT: Authentic Dhivehi Heritage, Linocut Woodcraft & Ocean Indigo
  holhuashi: {
    id: 'holhuashi',
    name: 'Holhuashi',
    subtitle: 'Dhivehi Heritage & Woodcut',
    badge: 'CRAFT',

    // Deep Coconut Timber Rim, No Neon Circles
    tableWrapperClass:
      'bg-gradient-to-b from-[#2a170d] via-[#1a0f08] to-[#100905] border-3 sm:border-5 border-[#3d2214] shadow-[0_20px_60px_rgba(0,0,0,0.95)]',
    tableBevelClass:
      'bg-gradient-to-b from-[#1e1008] to-[#0d0704] border border-amber-700/40 shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)]',
    // Ocean Indigo Mat with Subtle Woven Texture
    tableFeltClass:
      'bg-gradient-to-b from-[#0b212b] via-[#07161e] to-[#040e13] border border-cyan-900/30 shadow-inner',
    feltTextureClass: 'texture-woven-mat',
    watermarkText: 'ތާސްބައި',
    watermarkClass:
      'font-thaana text-amber-200/10 text-6xl sm:text-8xl font-black tracking-widest',

    fontHeader: 'font-craft',
    fontBody: 'font-sans-clean',
    fontCard: 'font-craft',
    fontNumber: 'font-craft',

    // Lacquerware Placard
    placardClass:
      'bg-gradient-to-b from-[#1c1109]/95 to-[#0f0904]/95 border-2 border-amber-700/60 shadow-xl text-amber-100',
    placardHeaderBorder: 'border-b border-amber-700/40',

    hudPillClass: 'bg-[#1a0f08]/90 text-amber-300 border-0 shadow-md',
    menuButtonClass:
      'bg-[#22130a]/90 hover:bg-[#341d10] border-0 text-amber-300',
    actionButtonClass:
      'bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-stone-950 font-black border-0 shadow-lg',

    // Cotton Ivory Card Face
    cardFaceClass:
      'bg-[#F6F2E8] border border-[#d2c9b6] shadow-md text-[#1c1917]',
    cardBackClass:
      'bg-gradient-to-br from-[#851e1e] via-[#661616] to-[#450e0e] border-2 border-amber-500/70 shadow-lg',
    cardBackInnerClass:
      'border border-amber-400/40 bg-[#521111]/90',
    cardBackLabelClass: 'text-amber-200 font-craft font-black',
    redSuitClass: 'text-[#B91C1C]',
    blackSuitClass: 'text-[#1C1917]',
    selectedCardRing: 'shadow-[0_15px_30px_rgba(217,119,6,0.4)] border-0',

    // Meld: Clean Solid Ivory with Dyed Cord Top Stripe & Distinct Tones
    getMeldHighlight: (colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET' || colorKey === 'amber';
      const isEmerald = colorKey === 'emerald' || colorKey === 'green';

      if (isEmerald) {
        return {
          ringClass: '',
          badgeClass: 'bg-emerald-600 text-white font-black shadow-sm',
          pipClass: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]',
          containerClass:
            'bg-gradient-to-b from-[#E6F4EA] via-[#F6F2E8] to-[#ECE5D3] border border-[#b8ae9c] border-t-4 border-t-emerald-600 shadow-[0_6px_18px_rgba(16,185,129,0.3)]',
        };
      }
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-amber-600 text-stone-950 font-black shadow-sm',
          pipClass: 'bg-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.9)]',
          containerClass:
            'bg-gradient-to-b from-[#FDF6E2] via-[#F6F2E8] to-[#ECE5D3] border border-[#b8ae9c] border-t-4 border-t-amber-500 shadow-[0_6px_18px_rgba(217,119,6,0.3)]',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-cyan-700 text-white font-black shadow-sm',
        pipClass: 'bg-cyan-500 shadow-[0_0_6px_rgba(8,145,178,0.9)]',
        containerClass:
          'bg-gradient-to-b from-[#E6F4F8] via-[#F6F2E8] to-[#ECE5D3] border border-[#b8ae9c] border-t-4 border-t-cyan-600 shadow-[0_6px_18px_rgba(8,145,178,0.3)]',
      };
    },
  },

  // 2. RETRO RISOGRAPH: 1970s Indie Print-Shop, Spot Inks & Tactile Halftones
  risograph: {
    id: 'risograph',
    name: 'Risograph',
    subtitle: '1970s Indie Print Shop',
    badge: 'RISO',

    // Flat Heavy Charcoal Board, 100% Anti-Glow
    tableWrapperClass:
      'bg-[#181c19] border-4 border-[#2b332d] shadow-[6px_6px_0px_#0a0d0b]',
    tableBevelClass:
      'bg-[#1c221e] border-2 border-[#38423a] shadow-none',
    // Sage Chalkboard Mat with Screen-Print Halftone Dots
    tableFeltClass:
      'bg-[#222b24] border-2 border-dashed border-[#445347]',
    feltTextureClass: 'texture-riso-dots',
    watermarkText: 'DIGU • RUMMY',
    watermarkClass:
      'font-riso text-white/10 text-5xl sm:text-7xl font-black tracking-tighter',

    fontHeader: 'font-riso',
    fontBody: 'font-riso',
    fontCard: 'font-riso',
    fontNumber: 'font-riso',

    // Stamped Score Placard
    placardClass:
      'bg-[#FAF5E8] border-2 border-[#1c1d1f] shadow-[3px_3px_0px_#000] text-[#1c1d1f]',
    placardHeaderBorder: 'border-b-2 border-[#1c1d1f]',

    hudPillClass: 'bg-[#FAF5E8] text-[#1c1d1f] border-2 border-[#1c1d1f] shadow-[2px_2px_0px_#000]',
    menuButtonClass:
      'bg-[#FAF5E8] hover:bg-[#fff] border-2 border-[#1c1d1f] text-[#1c1d1f] shadow-[2px_2px_0px_#000]',
    actionButtonClass:
      'bg-[#E63946] hover:bg-[#d42c39] border-2 border-[#1c1d1f] text-white font-black shadow-[3px_3px_0px_#000]',

    // Pulp Kraft Paper Card Face
    cardFaceClass:
      'bg-[#FFFDF7] border-2 border-[#1c1d1f] shadow-[3px_3px_0px_rgba(0,0,0,0.8)] text-[#1c1d1f]',
    cardBackClass:
      'bg-[#E63946] border-2 border-[#1c1d1f] shadow-[3px_3px_0px_#000]',
    cardBackInnerClass:
      'border-2 border-dashed border-white/60 bg-[#cf2f3c]',
    cardBackLabelClass: 'text-white font-riso font-black tracking-widest',
    redSuitClass: 'text-[#E63946]',
    blackSuitClass: 'text-[#1D3557]',
    selectedCardRing: 'border-[#1D3557] ring-4 ring-[#1D3557]/60 shadow-[5px_5px_0px_#000]',

    // Meld: Clean Solid Kraft with Stamp Stripe & Distinct Tones
    getMeldHighlight: (colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET' || colorKey === 'amber';
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-[#E63946] text-white font-bold',
          pipClass: 'bg-[#E63946]',
          containerClass:
            'bg-[#FFF8E7] border-2 border-[#1c1d1f] border-t-4 border-t-[#E63946] shadow-[3px_5px_0px_#1c1d1f]',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-[#1D3557] text-white font-bold',
        pipClass: 'bg-[#1D3557]',
        containerClass:
          'bg-[#EBF4FA] border-2 border-[#1c1d1f] border-t-4 border-t-[#1D3557] shadow-[3px_5px_0px_#1c1d1f]',
      };
    },
  },

  // 3. MALÉ NOCTURNE: Midnight Jade Stone & Warm Gilded Brass
  nocturne: {
    id: 'nocturne',
    name: 'Nocturne',
    subtitle: 'Midnight Jade & Tungsten',
    badge: 'NIGHT',

    // Honed Serpentine Jade Stone
    tableWrapperClass:
      'bg-gradient-to-b from-[#081512] to-[#040907] border-2 sm:border-3 border-[#152a23] shadow-[0_25px_60px_rgba(0,0,0,0.98)]',
    tableBevelClass:
      'bg-[#06100e] border border-emerald-500/20 shadow-[inset_0_4px_20px_rgba(0,0,0,0.9)]',
    // Midnight Jade Vignette Mat
    tableFeltClass:
      'bg-gradient-to-b from-[#0e211b] via-[#081512] to-[#030806] border border-emerald-400/20 shadow-inner',
    feltTextureClass: '',
    watermarkText: 'THÁASBAI',
    watermarkClass:
      'font-cinzel text-emerald-200/10 text-5xl sm:text-7xl font-bold tracking-[0.3em]',

    fontHeader: 'font-cinzel',
    fontBody: 'font-sans-clean',
    fontCard: 'font-cinzel',
    fontNumber: 'font-cinzel',

    // Honed Gilded Placard
    placardClass:
      'bg-[#071310]/95 backdrop-blur-md border border-amber-500/40 shadow-2xl text-stone-200',
    placardHeaderBorder: 'border-b border-amber-500/25',

    hudPillClass: 'bg-[#091713]/90 text-amber-300 border-0 shadow-md',
    menuButtonClass:
      'bg-[#0a1814]/90 hover:bg-[#122b24] border-0 text-amber-300',
    actionButtonClass:
      'bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-stone-950 font-black border-0 shadow-lg',

    // Obsidian Linen Card Face
    cardFaceClass:
      'bg-[#0c1613] border border-emerald-500/30 shadow-xl text-[#E2EBE7]',
    cardBackClass:
      'bg-gradient-to-br from-[#0c1a16] to-[#060e0c] border border-amber-500/40 shadow-xl',
    cardBackInnerClass:
      'border border-amber-400/20 bg-[#07120f]',
    cardBackLabelClass: 'text-amber-300 font-cinzel font-black tracking-widest',
    redSuitClass: 'text-[#E05A47]',
    blackSuitClass: 'text-[#A0C4B6]',
    selectedCardRing: 'shadow-[0_15px_30px_rgba(52,211,153,0.3)] border-0',

    // Meld: Clean Solid Obsidian with Distinct Gold / Jade Glow
    getMeldHighlight: (colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET' || colorKey === 'amber';
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-amber-400 text-stone-950 font-black shadow-sm',
          pipClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
          containerClass:
            'bg-gradient-to-b from-[#222822] via-[#121915] to-[#0A0E0C] border border-amber-500/40 border-t-4 border-t-amber-400 shadow-[0_6px_20px_rgba(251,191,36,0.35)]',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-emerald-400 text-stone-950 font-black shadow-sm',
        pipClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]',
        containerClass:
          'bg-gradient-to-b from-[#182820] via-[#121915] to-[#0A0E0C] border border-emerald-500/40 border-t-4 border-t-emerald-400 shadow-[0_6px_20px_rgba(52,211,153,0.35)]',
      };
    },
  },

  // 4. SWISS MODERNIST: Engineered Minimal, Tabular Precision & Pocket Micro-Physics
  swiss: {
    id: 'swiss',
    name: 'Swiss',
    subtitle: 'Engineered Precision Minimal',
    badge: 'SWISS',

    // Pure Flat Graphite
    tableWrapperClass:
      'bg-[#0f1113] border border-neutral-800 shadow-2xl',
    tableBevelClass:
      'bg-[#131619] border border-neutral-800/80 shadow-none',
    // Technical Matte Surface with Hairline Grid
    tableFeltClass:
      'bg-[#171b1f] border border-neutral-700/60',
    feltTextureClass: 'texture-grid-swiss',
    watermarkText: '010 DIGU',
    watermarkClass:
      'font-swiss text-white/10 text-4xl sm:text-6xl font-bold tracking-widest',

    fontHeader: 'font-swiss',
    fontBody: 'font-sans-clean',
    fontCard: 'font-swiss',
    fontNumber: 'font-swiss',

    // Minimalist Tabular Placard
    placardClass:
      'bg-[#1b2026] border border-neutral-700/80 shadow-lg text-white',
    placardHeaderBorder: 'border-b border-neutral-700/50',

    hudPillClass: 'bg-[#1b2026] text-neutral-200 border border-neutral-700',
    menuButtonClass:
      'bg-[#1b2026] hover:bg-[#252c34] border border-neutral-700 text-neutral-200',
    actionButtonClass:
      'bg-[#E11D48] hover:bg-[#f43f5e] text-white font-bold border border-rose-400/40 shadow',

    // Pure White Card Face
    cardFaceClass:
      'bg-white border border-neutral-300 shadow-sm text-[#0f172a]',
    cardBackClass:
      'bg-[#1d2228] border border-neutral-700 shadow-sm',
    cardBackInnerClass:
      'border border-neutral-600 bg-[#161a1e]',
    cardBackLabelClass: 'text-neutral-300 font-swiss font-bold tracking-widest',
    redSuitClass: 'text-[#E11D48]',
    blackSuitClass: 'text-[#0F172A]',
    selectedCardRing: 'border-rose-500 ring-3 ring-rose-500/50 shadow-md',

    // Meld: Architectural Top Stripe & Pill with Distinct Tones
    getMeldHighlight: (colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET' || colorKey === 'amber';
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-amber-500 text-white font-bold',
          pipClass: 'bg-amber-500',
          containerClass:
            'bg-amber-50/80 border border-neutral-300 border-t-4 border-t-amber-500 shadow-md',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-blue-600 text-white font-bold',
        pipClass: 'bg-blue-600',
        containerClass:
          'bg-blue-50/80 border border-neutral-300 border-t-4 border-t-blue-600 shadow-md',
      };
    },
  },
};
