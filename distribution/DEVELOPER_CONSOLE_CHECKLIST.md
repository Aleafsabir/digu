# Developer Console Onboarding & Account Setup Checklist
**App Name:** Holhuashi (Digu)  
**Package / Bundle ID:** `com.thaasbai.digu`

This document details the manual, one-time administrative and console configurations required on **Apple Developer Program** and **Google Play Console** before the automated CI/CD pipelines can deploy builds.

---

## 1. Apple Developer Program Requirements

### 1.1 Account & Legal Requirements
- [ ] **Enroll in Apple Developer Program**:
  - Individual or Organization ($99 USD / year).
  - *If Organization*: Obtain a **D-U-N-S Number** from Dun & Bradstreet (takes 1-3 business days).
- [ ] **Agreements, Tax, and Banking**:
  - Accept the latest *Apple Developer Program License Agreement* in [developer.apple.com](https://developer.apple.com).
  - Complete the *Paid Applications Schedule* in App Store Connect (required even for free apps that may add in-app purchases later).
  - Provide banking and tax information (W-8BEN / W-9).

### 1.2 App Store Connect API Key (for Fastlane Pilot / CI/CD)
- [ ] Navigate to **App Store Connect > Users and Access > Integrations > App Store Connect API**.
- [ ] Click **Generate API Key**:
  - Name: `Fastlane CI Holhuashi`
  - Access: `App Manager` or `Admin`
- [ ] Note down:
  - **Key ID** (e.g. `2X9R4274KS`) -> Map to `APP_STORE_CONNECT_KEY_ID` in GitHub Secrets.
  - **Issuer ID** (e.g. `69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) -> Map to `APP_STORE_CONNECT_ISSUER_ID`.
  - Download `.p8` private key file -> Base64 encode and map to `APP_STORE_CONNECT_KEY_CONTENT`.

### 1.3 App ID & Capabilities Setup
- [ ] Register App ID: `com.thaasbai.digu`.
- [ ] Enable Capability: **Sign in with Apple** (matches `@capacitor-firebase/authentication`).
- [ ] Create App Record in **App Store Connect**:
  - Name: `Holhuashi: Digu & Bondi Cards`
  - Primary Language: `English (US)`
  - Bundle ID: `com.thaasbai.digu`
  - SKU: `HOLHUASHI-001`

---

## 2. Google Play Console Requirements

### 2.1 Account & Identity Verification
- [ ] **Create Google Play Developer Account**:
  - One-time registration fee: $25 USD.
  - Complete government ID and phone number verification.
- [ ] **20-Tester Closed Testing Requirement** (For Personal Developer Accounts created after Nov 2023):
  - Google requires personal accounts to run a closed test with at least 20 opted-in testers for a minimum of 14 continuous days before applying for Production access.
  - *Strategy*: Use Fastlane `deploy_internal` to invite your internal team and beta testers immediately.

### 2.2 Google Play App Signing & Keystore
- [ ] **Enable Google Play App Signing**:
  - Google Play manages your final distribution key and generates optimized APKs from uploaded Android App Bundles (`.aab`).
- [ ] **Generate Release Keystore**:
  - Run the following command once to generate your permanent upload keystore:
    ```bash
    keytool -genkey -v -keystore android/release.keystore -alias holhuashi-upload -keyalg RSA -keysize 2048 -validity 10000
    ```
  - Store `release.keystore` securely (and map base64 string to `RELEASE_KEYSTORE_BASE64` in GitHub Secrets).
  - Set `RELEASE_KEY_ALIAS=holhuashi-upload` and `RELEASE_KEYSTORE_PASSWORD`.

### 2.3 Google Play API Service Account (for Fastlane Supply)
- [ ] Navigate to **Google Play Console > API Access**.
- [ ] Link a Google Cloud Project (can use existing GCP project `holhuashi-digu` `710897174854`).
- [ ] Create a **Service Account** with role `Release Manager` (or `Admin`).
- [ ] Generate JSON Key for the service account -> Save as `fastlane/google-play-api-key.json` (and map to `SUPPLY_JSON_KEY_DATA` in GitHub Secrets).
- [ ] In Google Play Console, grant the service account permissions:
  - *Edit and delete draft releases*
  - *Release to production, exclude devices, and use Play App Signing*
  - *Manage testing tracks and manage test track releases*

---

## 3. GitHub Secrets Mapping Matrix

Configure these secrets under **GitHub Repository > Settings > Secrets and variables > Actions**:

| GitHub Secret Name | Description | Source |
| :--- | :--- | :--- |
| `RELEASE_KEYSTORE_BASE64` | Base64-encoded `release.keystore` file | `base64 -w 0 android/release.keystore` |
| `RELEASE_KEYSTORE_PASSWORD` | Password for upload keystore | Defined during `keytool` generation |
| `RELEASE_KEY_ALIAS` | Key alias (e.g., `holhuashi-upload`) | Defined during `keytool` generation |
| `RELEASE_KEY_PASSWORD` | Password for key alias | Defined during `keytool` generation |
| `SUPPLY_JSON_KEY_DATA` | Google Play Service Account JSON key content | Google Cloud IAM / Play Console API Access |
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect API Key ID (10 chars) | App Store Connect > Users and Access |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect Issuer UUID | App Store Connect > Users and Access |
| `APP_STORE_CONNECT_KEY_CONTENT` | Base64-encoded `.p8` private key file | App Store Connect > Download Key |
| `MATCH_GIT_URL` | Private git repo URL for certificates | e.g. `git@github.com:Aleafsabir/digu-certificates.git` |
| `MATCH_PASSWORD` | Passphrase used to encrypt certificates | Defined by developer |
| `APPLE_ID` | Developer Apple ID email | Apple Developer Account |
| `APPLE_TEAM_ID` | 10-character Apple Developer Team ID | Apple Developer Membership Details |
