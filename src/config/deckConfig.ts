export type DeckDesignId = 'burgundy_gold' | 'sapphire_lattice' | 'maldivian_lacquer';

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
  burgundy_gold: {
    id: 'burgundy_gold',
    name: 'Royal Burgundy & Gold',
    tagline: 'Default Luxury Deck',
    badge: 'DEFAULT',
    description: 'Deep wine-red velvet canvas framed with 24K gold arabesque filigree and a royal star crest.',
    primaryColor: '#58111A',
    accentColor: '#D4AF37',
    previewBg: 'bg-gradient-to-br from-[#58111A] to-[#2A050A]',
    unlocked: true,
  },
  sapphire_lattice: {
    id: 'sapphire_lattice',
    name: 'Midnight Sapphire Lattice',
    tagline: 'Gin Rummy Plus Classic',
    badge: 'PLUS',
    description: 'Royal navy diamond cross-mesh with crisp white geometric filigree and an oval brass medallion.',
    primaryColor: '#0E224E',
    accentColor: '#38BDF8',
    previewBg: 'bg-gradient-to-br from-[#0E224E] to-[#061026]',
    unlocked: true,
  },
  maldivian_lacquer: {
    id: 'maldivian_lacquer',
    name: 'Maldivian Royal Lacquer',
    tagline: 'Liyelaa Jehun Heritage',
    badge: 'HERITAGE',
    description: 'Authentic Maldivian lacquer art: black and crimson canvas with yellow-gold floral borders.',
    primaryColor: '#1A0606',
    accentColor: '#F59E0B',
    previewBg: 'bg-gradient-to-br from-[#1A0606] via-[#450A0A] to-[#1A0606]',
    unlocked: true,
  },
};
