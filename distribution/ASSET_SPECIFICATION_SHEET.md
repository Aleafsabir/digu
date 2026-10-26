# Store Graphical Asset Specification Sheet & Manifest
**App Name:** Holhuashi (Digu)  
**Package / Bundle ID:** `com.thaasbai.digu`  
**Collateral Location:** `distribution/brand_assets/`

---

## 1. Google Play Store Graphical Specifications

| Asset Name | Resolution & Format | Alpha Channel | Color Space | Existing Collateral Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **App Icon** | 512 x 512 px, PNG (32-bit) | No transparency | sRGB | `distribution/brand_assets/holhuashi_app_icon_v2.jpg` (or SVG in `icon_proposals/`) |
| **Feature Graphic** | 1024 x 500 px, PNG or JPEG (Max 15 MB) | No transparency | sRGB | `distribution/brand_assets/digu_game_poster.jpg` (Scaled/Formatted to 1024x500) |
| **Phone Screenshots** | Min 1080 px short edge, 16:9 / 18:9 / 20:9 Landscape (e.g., 2400 x 1080 px or 1920 x 1080 px) | No transparency | sRGB | Generated via Fastlane `screengrab` into `fastlane/metadata/android/images/phoneScreenshots/` |
| **7-Inch Tablet Screenshots**| Min 1080 px, 16:10 Landscape (e.g., 1920 x 1200 px) | No transparency | sRGB | Generated via Fastlane `screengrab` |
| **10-Inch Tablet Screenshots**| Min 1080 px, 16:10 Landscape (e.g., 2560 x 1600 px) | No transparency | sRGB | Generated via Fastlane `screengrab` |

---

## 2. Apple App Store Graphical Specifications

| Display Form Factor | Screen Resolution (Landscape) | Device Mapping | Generation Pipeline |
| :--- | :--- | :--- | :--- |
| **App Store Icon** | 1024 x 1024 px, PNG (72 dpi) | Universal App Store Icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` |
| **6.9" Super Retina XDR** | 2868 x 1320 px (or 1320 x 2868) | iPhone 16 Pro Max | Fastlane `snapshot` (`iPhone 16 Pro Max`) |
| **6.7" Super Retina XDR** | 2796 x 1290 px (or 1290 x 2796) | iPhone 15 Pro Max / 15 Plus | Fastlane `snapshot` (`iPhone 15 Plus`) |
| **5.5" Retina Display** | 2208 x 1242 px (or 1242 x 2208) | iPhone 8 Plus / 7 Plus / 6s Plus | Fastlane `snapshot` (`iPhone 8 Plus`) |
| **13" Liquid Retina XDR** | 2732 x 2048 px (or 2048 x 2732) | iPad Pro 13-inch (M4) / 12.9" iPad | Fastlane `snapshot` (`iPad Pro 13-inch (M4)`) |

---

## 3. Preserved Brand & Marketing Collateral Index

The following high-resolution assets were safely migrated from the public bundle and are preserved in `distribution/brand_assets/` for store listings, promotional banners, and social collateral:

| Filename | Dimensions / Format | Recommended Usage |
| :--- | :--- | :--- |
| `digu_game_poster.jpg` | 1920 x 1080, JPEG | Primary Feature Graphic base & Google Play promo banner |
| `bondi_game_poster.jpg` | 1920 x 1080, JPEG | Bondi Mode promotional showcase & Social teaser |
| `dhihaeh_game_poster.jpg` | 1920 x 1080, JPEG | Dhihaeh Mode promotional showcase |
| `badge_4p_team_match.jpg` | 1080 x 1080, JPEG | 4-Player Partnership feature badge for store carousel |
| `badge_1v1_duel.jpg` | 1080 x 1080, JPEG | 1v1 Ranked Duel feature badge for store carousel |
| `ran_dhadhu_gold_coins.jpg` | 1080 x 1080, JPEG | Economy & Daily Chip Bonus store banner |
| `insignia_digu_1to1.jpg` | 512 x 512, JPEG | Digu crest icon badge |
| `insignia_bondi_1to1.jpg` | 512 x 512, JPEG | Bondi crest icon badge |
| `insignia_dhihaeh_1to1.jpg` | 512 x 512, JPEG | Dhihaeh crest icon badge |
| `holhuashi_app_icon_v2.jpg` | 1024 x 1024, JPEG | High-resolution master icon candidate |
| `icon_proposals/` | Master SVGs & Vector layers | Source vector files for generating custom resolution icons |
