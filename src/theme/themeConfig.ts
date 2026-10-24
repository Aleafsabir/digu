export type VisualTheme = 'royal_lacquer' | 'tournoi' | 'sultan' | 'holhuashi' | 'risograph' | 'nocturne' | 'swiss';

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
  // ROYAL LACQUER: LIYELAA JEHUN, BAA ATOLL SULTANATE FELT
  royal_lacquer: {
    id: 'royal_lacquer',
    name: 'Royal Lacquer',
    subtitle: 'Liyelaa Jehun • ލިޔެލާ ޖެހުން',
    badge: 'DEFAULT',

    tableWrapperClass:
      'bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-4 border-[#301a14] shadow-[0_25px_70px_rgba(0,0,0,0.98)]',
    tableBevelClass:
      'bg-[#170b09] border border-[#301a14] shadow-inner',
    tableFeltClass:
      'bg-radial from-[#26120e] via-[#160a08] to-[#0d0605] shadow-[inset_0_0_140px_rgba(0,0,0,0.95)] border border-[#301a14]',
    feltTextureClass: 'texture-velvet',
    watermarkText: 'ޑ',
    watermarkClass:
      'font-thaana text-[#e5c378]/15 text-7xl sm:text-9xl font-black drop-shadow-[0_0_25px_rgba(200,75,49,0.3)]',

    fontHeader: 'font-serif-luxury',
    fontBody: 'font-sans',
    fontCard: 'font-card-index',
    fontNumber: 'font-mono',

    placardClass:
      'bg-[#170b09]/95 border border-[#301a14] text-[#f7f0ea] shadow-xl',
    placardHeaderBorder: 'border-b border-[#301a14]',

    hudPillClass: 'bg-[#170b09]/95 border border-[#301a14] text-[#f7f0ea] shadow-md',
    menuButtonClass:
      'bg-[#170b09] hover:bg-[#301a14] border border-[#301a14] text-[#e5c378] shadow-md',
    actionButtonClass:
      'bg-gradient-to-r from-[#c84b31] to-[#e5c378] text-[#0d0605] font-black shadow-lg',

    cardFaceClass:
      'bg-[#FCFCFA] border-2 border-[#301a14]/30 shadow-2xl text-[#0d0605]',
    cardBackClass:
      'bg-gradient-to-br from-[#881313] via-[#3b0707] to-[#170b09] border-2 border-[#e5c378] shadow-2xl',
    cardBackInnerClass:
      'border border-[#e5c378]/40 bg-[#170b09]',
    cardBackLabelClass: 'text-[#e5c378] font-thaana font-black tracking-widest text-xl',
    redSuitClass: 'text-[#b91c1c]',
    blackSuitClass: 'text-[#0f172a]',
    selectedCardRing: 'ring-4 ring-[#e5c378] shadow-[0_0_25px_rgba(229,195,120,0.6)]',

    getMeldHighlight: (_colorKey: string, _meldIndex: number, _meldType?: 'SET' | 'RUN') => {
      return {
        ringClass: 'ring-3 ring-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.5)]',
        badgeClass: 'bg-[#301a14] text-[#e5c378] border border-[#e5c378]',
        containerClass: 'bg-[#e5c378]/10 rounded-2xl',
        pipClass: 'bg-[#e5c378]',
      };
    },
  },

  // MASTER: DIGU EMERALD, STADIUM FELT & ISLAND GOLD
  tournoi: {
    id: 'tournoi',
    name: 'Digu Emerald',
    subtitle: 'Stadium Felt & Island Gold',
    badge: 'MASTER',

    // Sleek Stadium Architectural Frame with Ambient Emerald Radiance
    tableWrapperClass:
      'bg-gradient-to-b from-[#063824] via-[#021B11] to-[#010A06] border-4 border-[#05D59A]/30 shadow-[0_25px_70px_rgba(0,0,0,0.98)]',
    tableBevelClass:
      'bg-[#02140D] border border-[#05D59A]/20 shadow-inner',
    tableFeltClass:
      'stadium-felt-surface shadow-inner border border-[#05D59A]/20',
    feltTextureClass: 'texture-velvet',
    watermarkText: 'ޑ',
    watermarkClass:
      'font-thaana text-[#05D59A]/15 text-7xl sm:text-9xl font-black drop-shadow-[0_0_25px_rgba(5,213,154,0.3)]',

    fontHeader: 'font-sans-clean',
    fontBody: 'font-sans-clean',
    fontCard: 'font-sans-clean',
    fontNumber: 'font-mono',

    // Sleek Modern Glassmorphic Score Placard
    placardClass:
      'glass-panel-emerald-elevated text-white',
    placardHeaderBorder: 'border-b border-[#05D59A]/30',

    hudPillClass: 'glass-panel-emerald text-[#F1F5F9] shadow-md',
    menuButtonClass:
      'glass-panel-emerald hover:border-[#05D59A] text-slate-200 shadow-md',
    actionButtonClass:
      'btn-emerald-glow',

    // High-Contrast Clean Ivory Card Face
    cardFaceClass:
      'bg-[#FCFCFA] border-2 border-slate-300 shadow-2xl text-[#1A1715]',
    cardBackClass:
      'bg-gradient-to-br from-[#063824] via-[#02140D] to-[#010A06] border-2 border-[#E5C378] shadow-2xl',
    cardBackInnerClass:
      'border border-[#E5C378]/40 bg-[#02140D]',
    cardBackLabelClass: 'text-[#E5C378] font-thaana font-black tracking-widest text-xl',
    redSuitClass: 'text-[#DC2626]',
    blackSuitClass: 'text-[#1A1715]',
    selectedCardRing: 'card-glow-emerald border-2 border-[#05D59A]',

    // Melds: Bioluminescent Emerald (Runs) & Island Gold (Sets)
    getMeldHighlight: (_colorKey, _idx, meldType) => {
      const isSet = meldType === 'SET';
      if (isSet) {
        return {
          ringClass: '',
          badgeClass: 'bg-[#E5C378] text-slate-950 font-black shadow-sm',
          pipClass: 'bg-[#E5C378] shadow-[0_0_8px_rgba(229,195,120,0.95)]',
          containerClass:
            'bg-gradient-to-b from-[#FFFBEB] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-[#E5C378] shadow-[0_6px_20px_rgba(229,195,120,0.35)]',
        };
      }
      return {
        ringClass: '',
        badgeClass: 'bg-[#05D59A] text-slate-950 font-black shadow-sm',
        pipClass: 'bg-[#05D59A] shadow-[0_0_8px_rgba(5,213,154,0.95)]',
        containerClass:
          'bg-gradient-to-b from-[#ECFDF5] via-[#FAF6EC] to-[#F3EDE0] border border-[#c8beaa] border-t-4 border-t-[#05D59A] shadow-[0_6px_20px_rgba(5,213,154,0.35)]',
      };
    },
  },
  // 0. ROYAL LACQUER: Maldivian Liyelaa Jehun Lacquerwork, Crimson & Gold
  sultan: {
    id: 'sultan',
    name: 'Royal Lacquer',
    subtitle: 'Maldivian Crimson & Island Gold',
    badge: 'ROYALE',

    tableWrapperClass:
      'bg-gradient-to-b from-[#2A050A] via-[#150204] to-[#02140D] border-4 sm:border-6 border-[#EF4444]/30 shadow-[0_25px_70px_rgba(0,0,0,0.98)]',
    tableBevelClass:
      'bg-[#150204] border border-[#EF4444]/20 shadow-inner',
    tableFeltClass:
      'bg-gradient-to-b from-[#400B12] via-[#250408] to-[#0F0204] border border-[#EF4444]/20 shadow-inner',
    feltTextureClass: 'texture-velvet',
    watermarkText: 'ޑ',
    watermarkClass:
      'font-thaana text-rose-500/15 text-7xl sm:text-9xl font-black drop-shadow-[0_0_25px_rgba(239,68,68,0.3)]',

    fontHeader: 'font-sans-clean',
    fontBody: 'font-sans-clean',
    fontCard: 'font-sans-clean',
    fontNumber: 'font-mono',

    // Gilded Crimson Placard
    placardClass:
      'bg-gradient-to-b from-[#1C0508]/95 to-[#0D0204]/95 border-2 border-[#EF4444]/50 shadow-2xl text-rose-100',
    placardHeaderBorder: 'border-b border-[#EF4444]/30',

    hudPillClass: 'bg-[#150204]/90 text-amber-300 border border-[#EF4444]/20 shadow-md',
    menuButtonClass:
      'bg-[#1C0508]/90 hover:bg-[#2C080E] border border-[#EF4444]/30 text-amber-300',
    actionButtonClass:
      'btn-emerald-glow',

    // Aristocrat Ivory Card Face
    cardFaceClass:
      'bg-[#F9F7EE] border border-amber-900/30 shadow-2xl text-[#1a1815]',
    cardBackClass:
      'bg-gradient-to-br from-[#58111A] to-[#2A050A] border-2 border-[#E5C378]/80 shadow-2xl',
    cardBackInnerClass:
      'border border-[#E5C378]/40 bg-[#400B12]',
    cardBackLabelClass: 'text-[#E5C378] font-thaana font-black tracking-widest text-xl',
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

  // 1. HOLHUASHI LAGOON: Authentic Dhivehi Beachfront Gathering, Night Ocean & Island Gold
  holhuashi: {
    id: 'holhuashi',
    name: 'Holhuashi Lagoon',
    subtitle: 'Night Ocean & Island Gold',
    badge: 'ISLAND',

    tableWrapperClass:
      'bg-gradient-to-b from-[#0A2218] via-[#02140D] to-[#010A06] border-3 sm:border-5 border-[#E5C378]/30 shadow-[0_20px_60px_rgba(0,0,0,0.95)]',
    tableBevelClass:
      'bg-gradient-to-b from-[#02140D] to-[#010A06] border border-[#E5C378]/20 shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)]',
    tableFeltClass:
      'bg-gradient-to-b from-[#063824] via-[#032014] to-[#010D08] border border-[#E5C378]/20 shadow-inner',
    feltTextureClass: 'texture-woven-mat',
    watermarkText: 'ހ',
    watermarkClass:
      'font-thaana text-[#E5C378]/15 text-7xl sm:text-9xl font-black drop-shadow-[0_0_25px_rgba(229,195,120,0.3)]',

    fontHeader: 'font-sans-clean',
    fontBody: 'font-sans-clean',
    fontCard: 'font-sans-clean',
    fontNumber: 'font-mono',

    // Lacquerware Placard
    placardClass:
      'bg-gradient-to-b from-[#031B11]/95 to-[#010A06]/95 border-2 border-[#E5C378]/50 shadow-xl text-amber-100',
    placardHeaderBorder: 'border-b border-[#E5C378]/30',

    hudPillClass: 'bg-[#02140D]/90 text-amber-300 border border-[#E5C378]/20 shadow-md',
    menuButtonClass:
      'bg-[#031B11]/90 hover:bg-[#063824] border border-[#E5C378]/30 text-amber-300',
    actionButtonClass:
      'btn-emerald-glow',

    // Cotton Ivory Card Face
    cardFaceClass:
      'bg-[#F6F2E8] border border-[#d2c9b6] shadow-md text-[#1c1917]',
    cardBackClass:
      'bg-gradient-to-br from-[#063824] via-[#02140D] to-[#010A06] border-2 border-[#E5C378]/80 shadow-lg',
    cardBackInnerClass:
      'border border-[#E5C378]/40 bg-[#02140D]/90',
    cardBackLabelClass: 'text-[#E5C378] font-thaana font-black tracking-widest text-xl',
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
    name: 'Malé Midnight',
    subtitle: 'Midnight Jade & Bioluminescence',
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
    watermarkText: 'ޑ',
    watermarkClass:
      'font-thaana text-[#05D59A]/15 text-6xl sm:text-8xl font-black drop-shadow-[0_0_25px_rgba(5,213,154,0.3)]',

    fontHeader: 'font-sans-clean',
    fontBody: 'font-sans-clean',
    fontCard: 'font-sans-clean',
    fontNumber: 'font-mono',

    // Honed Gilded Placard
    placardClass:
      'bg-[#071310]/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl text-stone-200',
    placardHeaderBorder: 'border-b border-emerald-500/25',

    hudPillClass: 'bg-[#091713]/90 text-emerald-300 border-0 shadow-md',
    menuButtonClass:
      'bg-[#0a1814]/90 hover:bg-[#122b24] border-0 text-emerald-300',
    actionButtonClass:
      'btn-emerald-glow',

    // Obsidian Linen Card Face
    cardFaceClass:
      'bg-[#0c1613] border border-emerald-500/30 shadow-xl text-[#E2EBE7]',
    cardBackClass:
      'bg-gradient-to-br from-[#0c1a16] to-[#060e0c] border border-emerald-500/40 shadow-xl',
    cardBackInnerClass:
      'border border-emerald-400/20 bg-[#07120f]',
    cardBackLabelClass: 'text-[#05D59A] font-thaana font-black tracking-widest text-xl',
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
