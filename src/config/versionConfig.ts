export interface AppUpdateInfo {
  versionName: string;
  versionCode: number;
  releaseDate: string;
  downloadUrl: string;
  isMandatory: boolean;
  releaseNotes: string[];
}

export const APP_VERSION_CONFIG = {
  versionName: '0.5.4',
  versionCode: 19,
  appName: 'Holhuashi',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.thaasbai.digu',
  playStoreMarketUrl: 'market://details?id=com.thaasbai.digu',
  appStoreUrl: 'https://apps.apple.com/app/holhuashi/id6470000000',
  appStoreSchemeUrl: 'itms-apps://itunes.apple.com/app/id6470000000',
  manifestUrl: 'https://raw.githubusercontent.com/Aleafsabir/digu/main/public/version.json',
} as const;
