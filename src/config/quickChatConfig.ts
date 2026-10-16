/**
 * Quick Chat & Emojis Configuration
 * 
 * 🎮 HOW TO EDIT PHRASES:
 * - You can freely add, modify, or remove phrases in the QUICK_CHAT_PHRASES array below.
 * - Each phrase has:
 *    - `id`: unique string identifier (e.g., 'my_custom_phrase')
 *    - `text`: the phrase shown in-game and spoken in the speech bubble
 *    - `category`: 'banter' | 'tactical' | 'friendly' (organizes the phrase in the menu)
 *    - `translation` (optional): helpful English meaning displayed beneath Dhivehi phrases
 * 
 * 😀 HOW TO EDIT EMOJIS:
 * - Add or replace emojis in the QUICK_CHAT_EMOJIS array below.
 */

export interface QuickChatPhrase {
  id: string;
  text: string;
  category: 'banter' | 'tactical' | 'friendly';
  translation?: string; // Optional English explanation for Dhivehi banter
}

export const QUICK_CHAT_PHRASES: QuickChatPhrase[] = [
  // Maldivian Thaasbai Banter
  {
    id: 'kaala_bala',
    text: 'Kaala bala!',
    category: 'banter',
    translation: 'Take that / Eat it!',
  },
  {
    id: 'gin_vejje',
    text: 'Gin vejje!',
    category: 'tactical',
    translation: 'Gin is coming / Gin ready!',
  },
  {
    id: 'haadha_molhey',
    text: 'Haadha molhey!',
    category: 'banter',
    translation: 'Too skillful / Showing off!',
  },
  {
    id: 'dhefaulhaa',
    text: 'Dhefaulhaa bala!',
    category: 'banter',
    translation: 'Watch the trap!',
  },

  // Tactical & Friendly Table Phrases
  {
    id: 'nice_discard',
    text: 'Nice discard!',
    category: 'friendly',
  },
  {
    id: 'partner_ready',
    text: 'Partner, I got this!',
    category: 'tactical',
  },
  {
    id: 'good_luck',
    text: 'Good luck!',
    category: 'friendly',
  },
  {
    id: 'oops',
    text: 'Oops!',
    category: 'banter',
  },
  {
    id: 'well_played',
    text: 'Well played!',
    category: 'friendly',
  },
];

export const QUICK_CHAT_EMOJIS: string[] = [
  '🤣', // Laughing / banter
  '😎', // Confident / sunglasses
  '😱', // Shocked / high card drawn
  '🔥', // On fire / winning streak
  '👏', // Clapping / well played
  '😭', // Crying / bad discard
  '🤯', // Mind blown
  '☕', // Chilling / Maldivian sai time
];
