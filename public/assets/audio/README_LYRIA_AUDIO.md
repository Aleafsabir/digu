# Digu — Lyria Music & Audio Assets Guide (`public/assets/audio/`)

Place your generated **Google Lyria** or **NCS (No-Copyright)** `.mp3` files directly into this folder (`c:\Users\Aleef Sabir\Digu\public\assets\audio\`).
The game and interactive prototype automatically detect and stream these files!

---

## 1. Exact File Names to Place in `public/assets/audio/`

| File Name | Used Where | Recommended Duration |
| :--- | :--- | :--- |
| **`bgm_table.mp3`** | In-Game Card Table Background Music (loops seamlessly) | 30s – 120s |
| **`bgm_lobby.mp3`** | Main Lobby & Menus Background Music (loops seamlessly) | 30s – 120s |
| **`bgm_victory.mp3`** | *(Optional)* Round Win / 1,000-Point Run Celebration Stinger | 5s – 15s |

*(Note: If only `bgm_table.mp3` is placed here, the game will use it for both Lobby and Table until `bgm_lobby.mp3` is added.)*

---

## 2. How to Generate Tracks with Google Lyria (No API Code Needed)

### Option A: Google AI Studio (`Lyria 3.5` / `Lyria 3 Clip`)
1. Open **[Google AI Studio](https://aistudio.google.com/)**.
2. In the right-hand **Model** dropdown, select **`Lyria 3.5` (`lyria-3.5`)** for a full 2-minute track, or **`Lyria 3 Clip` (`lyria-3-clip-preview`)** for a 30-second loop.
3. Paste one of the prompts below and run it.
4. Click the **Download (`.mp3`)** button on the generated audio player and save it into `c:\Users\Aleef Sabir\Digu\public\assets\audio\`.

### Option B: Google Labs MusicFX DJ (Powered by Lyria)
1. Open **[MusicFX by Google Labs](https://aitestkitchen.withgoogle.com/tools/music-fx)**.
2. Toggle **"Loop"** on (or set Track Length to **50s** or **70s**).
3. Paste one of the prompts below, generate, and click **Download MP3**.

---

## 3. Ready-to-Copy Lyria Prompts (Instrumental NCS / Casino Lounge Style)

### Prompt 1 — For `bgm_table.mp3` (Smooth NCS Chill Lofi / VIP Card Room Groove)
> **Prompt:**
> `Instrumental only, no vocals. Smooth chill lofi hip-hop and tropical lounge beat at 88 BPM. Warm Fender Rhodes electric piano jazz chords, deep round sub-bass, crisp rimshot and brushed hi-hat groove, subtle acoustic guitar plucks, relaxing late-night VIP card room atmosphere, clean studio master, seamless loop.`

### Prompt 2 — For `bgm_lobby.mp3` (Upbeat NCS Tropical Chill / Island Sunset Lounge)
> **Prompt:**
> `Instrumental only, no vocals. Upbeat NCS style tropical chill house and melodic lounge at 105 BPM. Warm marimba and plucked acoustic melodies, lush atmospheric synth pads, clean punchy kick and shaker groove, uplifting Maldivian island sunset vibe, modern game lobby soundtrack, seamless loop.`

### Prompt 3 — Alternative `bgm_table.mp3` (Classic Velvet Casino Jazz Lounge)
> **Prompt:**
> `Instrumental only, no vocals. Cool late-night acoustic casino lounge jazz at 92 BPM. Walking upright double bass, soft brushed snare drums, warm muted Rhodes piano chords, subtle vibraphone accents, sophisticated card table ambiance, seamless loop.`
