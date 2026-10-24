export type DeckDesignId =
  | 'royal_lacquer'
  | 'bicycle_red'
  | 'bicycle_blue'
  | 'casino_emerald'
  | 'digu_emerald'
  | 'burgundy_gold'
  | 'sapphire_lattice'
  | 'maldivian_lacquer';

export interface DeckDesignMeta {
  id: DeckDesignId;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  previewBg: string;
  unlocked: boolean;
  price?: number;
}

export const DECK_DESIGNS: Record<DeckDesignId, DeckDesignMeta> = {
  royal_lacquer: {
    id: 'royal_lacquer',
    name: 'Royal Cinnabar & Gold',
    tagline: 'Liyelaa Jehun Edition',
    badge: 'HERITAGE',
    description: 'Crisp ivory poker border with deep lacquer cinnabar guilloché and twin 24K gold medallions.',
    primaryColor: '#881313',
    accentColor: '#e5c378',
    previewBg: 'bg-gradient-to-br from-[#881313] via-[#3b0707] to-[#170b09]',
    unlocked: true,
  },
  bicycle_red: {
    id: 'bicycle_red',
    name: 'Bicycle Classic Rider Red',
    tagline: 'Authentic Casino Standard',
    badge: 'CLASSIC',
    description: 'Iconic American poker standard: crisp ivory white border with crimson filigree scrollwork.',
    primaryColor: '#b91c1c',
    accentColor: '#faf6ee',
    previewBg: 'bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d]',
    unlocked: true,
  },
  bicycle_blue: {
    id: 'bicycle_blue',
    name: 'Bicycle Classic Rider Blue',
    tagline: 'Authentic Casino Standard',
    badge: 'CLASSIC',
    description: 'Deep cobalt blue filigree scrollwork with crisp ivory white border and mirrored medallions.',
    primaryColor: '#1d4ed8',
    accentColor: '#faf6ee',
    previewBg: 'bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a]',
    unlocked: true,
  },
  casino_emerald: {
    id: 'casino_emerald',
    name: 'KEM Casino Emerald',
    tagline: 'Tournament Acetate Edition',
    badge: 'TOURNAMENT',
    description: 'Vibrant green casino crosshatch with gold accents and crisp ivory borders.',
    primaryColor: '#047857',
    accentColor: '#e5c378',
    previewBg: 'bg-gradient-to-br from-[#047857] to-[#064e3b]',
    unlocked: true,
  },
  // Legacy aliases for backward compatibility
  digu_emerald: {
    id: 'digu_emerald',
    name: 'Digu Emerald Lacquer',
    tagline: 'Flagship Maldivian Felt',
    badge: 'DEFAULT',
    description: 'Deep stadium felt green framed with liquid gold filigree and an authentic ޑ Thaana crest.',
    primaryColor: '#047857',
    accentColor: '#e5c378',
    previewBg: 'bg-gradient-to-br from-[#047857] to-[#064e3b]',
    unlocked: true,
  },
  burgundy_gold: {
    id: 'burgundy_gold',
    name: 'Royal Burgundy & Gold',
    tagline: 'Luxury Velvet Deck',
    badge: 'PREMIUM',
    description: 'Deep wine-red velvet canvas framed with 24K gold arabesque filigree and a royal star crest.',
    primaryColor: '#881313',
    accentColor: '#e5c378',
    previewBg: 'bg-gradient-to-br from-[#881313] via-[#3b0707] to-[#170b09]',
    unlocked: true,
  },
  sapphire_lattice: {
    id: 'sapphire_lattice',
    name: 'Midnight Sapphire Lattice',
    tagline: 'Gin Rummy Plus Classic',
    badge: 'PLUS',
    description: 'Royal navy diamond cross-mesh with crisp white geometric filigree and an oval brass medallion.',
    primaryColor: '#1d4ed8',
    accentColor: '#faf6ee',
    previewBg: 'bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a]',
    unlocked: true,
  },
  maldivian_lacquer: {
    id: 'maldivian_lacquer',
    name: 'Maldivian Royal Lacquer',
    tagline: 'Liyelaa Jehun Heritage',
    badge: 'HERITAGE',
    description: 'Authentic Maldivian lacquer art: black and crimson canvas with yellow-gold floral borders.',
    primaryColor: '#881313',
    accentColor: '#e5c378',
    previewBg: 'bg-gradient-to-br from-[#881313] via-[#3b0707] to-[#170b09]',
    unlocked: true,
  },
};
