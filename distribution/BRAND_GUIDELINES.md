# Holhuashi (ހޮޅުއަށި) — Brand Identity & Design System Guidelines
**Project:** Holhuashi: Maldivian Rummy & Cards  
**Package / Bundle ID:** `com.thaasbai.digu`  
**Identity System:** The Sovereign Pavilion (*Liyelaa Holhuashi*)  
**Version:** 1.0 (Production Master)  

---

## 1. Brand Narrative & Cultural Origin

In the Maldives, a ***Holhuashi*** (ހޮޅުއަށި) is the traditional island social pavilion—a thatched or open-air timber shelter set along the beach or village crossroads where community members gather in the ocean breeze to drink spiced black tea, share stories, and play spirited, competitive card games like **Digu** (1,000-point Maldivian Rummy), **Bondi**, and **Katte**.

The brand identity marries this cultural gathering tradition with the revered craftsmanship of **Liyelaa Jehun** (traditional Maldivian royal lacquer turning), transforming the humble beachside bench into an emblem of regal card mastery.

---

## 2. Core Brand Marks

All official vector masters and raster exports are preserved in [`distribution/brand_assets/logos/production/`](file:///c:/Users/Aleef%20Sabir/Digu/distribution/brand_assets/logos/production):

```
                       Brand Mark Architecture
┌───────────────────────────┬─────────────────────────────────────────────────┐
│ Primary Symbol            │ • Sovereign Pavilion Emblem                     │
│                           │   (holhuashi-symbol.svg)                        │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ Horizontal Lockup         │ • Symbol + Wordmark + Thaana + Subtitle         │
│                           │   (holhuashi-horizontal.svg)                    │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ Stacked Lockup            │ • Centered Symbol over Multiline Typography     │
│                           │   (holhuashi-stacked.svg)                       │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ Small-Scale Favicon Cut   │ • Optically bolded geometry for 16px–32px       │
│                           │   (holhuashi-symbol-small.svg)                  │
└───────────────────────────┴─────────────────────────────────────────────────┘
```

### 2.1 The Sovereign Pavilion (*Liyelaa Holhuashi*)
- **Geometry:** A sweeping traditional island pavilion roof canopy seamlessly interlocking with the silhouette of an Ace of Spades and fanned card melds, resting upon a handcrafted 3-tier joali timber foundation with brass/gold pin joints.
- **Usage:** Primary app icon, store listing icon, splash screen hero, and victory medallions.

### 2.2 Horizontal & Stacked Lockups
- **Horizontal:** Primary brand header for websites, marketing banners, and wide landscape splash screens.
- **Stacked:** Square avatars, social media banners, game posters, and splash centerpieces.

---

## 3. Official Color System (Dhivehi Lacquer Palette)

The color palette is derived directly from the centuries-old Maldivian lacquer turning tradition (*Liyelaa Jehun*), using cinnabar red, gold leaf, and deep resin obsidian:

| Color Swatch | Name | HEX | RGB | CMYK | Pantone Match | Role |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| ![#E5C378](https://via.placeholder.com/16/E5C378/000000?text=+) | **Royal Amber Gold** | `#E5C378` | `229, 195, 120` | `15, 23, 62, 0` | PMS 7508 C | Primary Brand Accent, Roof Canopy, Rim |
| ![#C62828](https://via.placeholder.com/16/C62828/000000?text=+) | **Sovereign Cinnabar** | `#C62828` | `198, 40, 40` | `16, 98, 97, 7` | PMS 187 C | Card Suits, Inner Pin Line, Divider Diamond |
| ![#0D0605](https://via.placeholder.com/16/0D0605/000000?text=+) | **Lacquer Obsidian** | `#0D0605` | `13, 6, 5` | `70, 72, 72, 88` | PMS Black 7 C | Ground Medallion, Spade Silhouette |
| ![#FBF8F2](https://via.placeholder.com/16/FBF8F2/000000?text=+) | **Parchment Cream** | `#FBF8F2` | `251, 248, 242` | `1, 2, 4, 0` | Cool Gray 1 C | Card Faces, Primary Typography |
| ![#00A896](https://via.placeholder.com/16/00A896/000000?text=+) | **Lagoon Turquoise** | `#00A896` | `0, 168, 150` | `83, 11, 48, 0` | PMS 3272 C | Oceanic Accent, Bondi Game Badges |

---

## 4. Typography System

```
                  Typography Hierarchy
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ Primary Wordmark     │ CINZEL (Bold / 800, All Caps, Letter-spacing: +6)       │
│                      │ Classic high-contrast serif conveying regal prestige    │
├──────────────────────┼─────────────────────────────────────────────────────────┤
│ Cultural Script      │ MV WAHEED / FARUMA (Bold, Letter-spacing: +2)           │
│                      │ Authentic Dhivehi Thaana script: ހޮޅުއަށި               │
├──────────────────────┼─────────────────────────────────────────────────────────┤
│ Subtitle & Interface │ PLUS JAKARTA SANS (Bold / 700, Letter-spacing: +4)      │
│                      │ Clean geometric sans for high digital scannability      │
└──────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 5. Clear Space & Scaling Rules

### 5.1 Clear Space
To ensure the mark retains visual punch and authority, maintain a minimum exclusion zone around the mark equal to **half the height of the pavilion canopy** ($X/2$):
- No typography, graphics, borders, or page edges should intrude inside this boundary.

### 5.2 Minimum Scale Thresholds
- **Master Symbol (`holhuashi-symbol.svg`):** Minimum display size is **48 px** (or 15 mm in physical print).
- **Small-Scale Cut (`holhuashi-symbol-small.svg`):** For smaller displays from **16 px to 32 px** (browser favicon, watch complications, status bar icons). Features thickened vector strokes and an enlarged central spade for instant readability.

---

## 6. Brand Delivery Asset Inventory

All production deliverables are structured under [`distribution/brand_assets/logos/production/`](file:///c:/Users/Aleef%20Sabir/Digu/distribution/brand_assets/logos/production):

### 6.1 Vector Masters (SVG)
- `holhuashi-symbol.svg` — Master full-color symbol (256x256).
- `holhuashi-symbol-small.svg` — Master optical small-size cut (for 16px–32px).
- `holhuashi-horizontal.svg` — Master full-color horizontal lockup (768x256).
- `holhuashi-stacked.svg` — Master full-color vertical stacked lockup (512x512).
- `holhuashi-symbol-black.svg` — One-color pure black master.
- `holhuashi-symbol-white.svg` — One-color pure white master.
- `holhuashi-symbol-mono-e5c378.svg` — One-color royal gold master.
- `holhuashi-horizontal-black.svg` / `white.svg` / `mono.svg` — One-color horizontal lockups.
- `holhuashi-stacked-black.svg` / `white.svg` / `mono.svg` — One-color stacked lockups.

### 6.2 High-Resolution Raster Assets (PNG)
- **Symbol:** 32px, 64px, 128px, 256px, 512px, 1024px (transparent).
- **Square Avatar:** 32px, 64px, 128px, 256px, 512px, 1024px.
- **App Icon Master:** 32px, 64px, 128px, 256px, 512px, 1024px (ready for App Store & Google Play).
- **Horizontal Lockup:** 600px, 1200px (black, white, mono).
- **Stacked Lockup:** 512px, 1024px (black, white, mono).

### 6.3 Web & PWA Icon Bundle
- `favicon.ico` — Multi-resolution browser icon (16x16, 32x32, 48x48).
- `favicon.svg` — Modern scalable browser favicon.
- `apple-touch-icon.png` — iOS Safari home screen bookmark (180x180).
- `icon-192.png` / `icon-512.png` / `maskable-512.png` — Android Chrome PWA icons.
- `site.webmanifest` & `head-snippet.html` — Copy-paste HTML header snippets.

---

## 7. Misuse & Brand Integrity Rules

1. **Do NOT Skew or Distort:** Never stretch, compress, or tilt the symbol or logotype non-proportionally.
2. **Do NOT Apply Cheap Drop Shadows:** The mark relies on crisp lacquer silhouettes; avoid heavy Gaussian blurs or cheesy 3D bevels.
3. **Do NOT Remove the Thaana Script:** In complete horizontal and stacked lockups, the Dhivehi script (*ހޮޅުއަށި*) is a mandatory cultural hallmark.
4. **Do NOT Low-Contrast Place:** Never place the dark medallion directly against dark chocolate or charcoal backgrounds without the protective gold rim.
