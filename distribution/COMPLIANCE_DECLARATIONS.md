# Compliance Declarations: Data Safety & Privacy Nutrition Labels
**App Name:** Holhuashi  
**Package / Bundle ID:** `com.thaasbai.digu`  
**Platform Compliance Level:** Apple iOS 18+ / Android 16 (API 36) / Google Play 2026 Policy

---

## 1. Google Play Store: Data Safety Section

| Data Type | Collected? | Shared with 3rd Parties? | Purpose | Ephemeral / Stored | User Can Request Deletion? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal Info: Name / Display Name** | Optional (Yes if Google Sign-In linked) | **No** | Account management, multiplayer lobby presence | Stored until account reset | **Yes** (via in-game Profile or support email) |
| **Personal Info: Email Address** | Optional (Yes if Google Sign-In linked) | **No** | Account management, cloud save restoration | Stored until account reset | **Yes** |
| **Personal Info: User IDs (UID)** | **Yes** (Firebase / Session ID) | **No** | App functionality, match reconnection, game state sync | Stored | **Yes** |
| **Financial Info: Purchases / Payment** | **No** | **No** | Free-to-play simulated currency only | N/A | N/A |
| **Location Data** | **No** | **No** | None | N/A | N/A |
| **Photos & Videos** | **No** | **No** | Avatars are built-in game illustrations | N/A | N/A |
| **Audio Files** | **No** | **No** | Built-in sound effects & BGM only | N/A | N/A |
| **App Activity: Game Saves / Scores** | **Yes** | **No** | Career statistics, high scores, win streaks | Stored | **Yes** |
| **Diagnostics: Crash Logs / Vitals** | **Yes** (via Google Play Vitals) | **No** | Performance optimization, crash prevention | Managed by OS | Yes (OS opted) |

### Security Practices Checklist:
- **Data Encryption in Transit**: Yes. All API and WebSocket data transmitted to the backend uses TLS/HTTPS (`wss://` and `https://`).
- **Data Deletion Mechanism**: Yes. Users can delete cloud profile and transactions by contacting `privacy@holhuashi.com` or resetting profile in settings.
- **Target Audience / Families Policy**: Not targeted primarily at children under 13 (Neutral age screen if required).

---

## 2. Apple App Store: Privacy Nutrition Labels

### Tracking Data
- **Does this app use data to track the user across apps and websites owned by other companies?**
  **NO**. Holhuashi does not track users across third-party apps or websites.

### Data Linked to the User
The following data collected by the app may be linked to the user's identity (via Google / Apple / Firebase authentication):

| Category | Specific Data Type | Usage Purpose |
| :--- | :--- | :--- |
| **Identifiers** | User ID | App Functionality (Multiplayer pairing, cloud save restoration, presence) |
| **Contact Info** | Email Address (Optional) | App Functionality (Account recovery) |
| **Gameplay Content**| Saved Game State / Stats | App Functionality (Progression, coins, win streak) |

### Data Not Linked to the User
| Category | Specific Data Type | Usage Purpose |
| :--- | :--- | :--- |
| **Diagnostics** | Crash Data / Performance Data | Analytics & App Improvement |

---

## 3. Apple Privacy Manifest (`PrivacyInfo.xcprivacy`) Reference

The app includes an official `PrivacyInfo.xcprivacy` located at `ios/App/App/PrivacyInfo.xcprivacy`:
```xml
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>35F4.1</string>
            </array>
        </dict>
    </array>
</dict>
```
