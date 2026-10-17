export interface AppUpdateInfo {
  versionName: string;
  versionCode: number;
  releaseDate: string;
  downloadUrl: string;
  isMandatory: boolean;
  releaseNotes: string[];
}

export const APP_VERSION_CONFIG = {
  versionName: '0.2.0',
  versionCode: 2,
  appName: 'Holhuashi: Digu',
  githubRepo: 'Aleafsabir/digu',
  manifestUrl: '/version.json',
  githubApiUrl: 'https://api.github.com/repos/Aleafsabir/digu/releases/latest',
  directApkUrl: 'https://github.com/Aleafsabir/digu/releases/latest/download/app-debug.apk',
} as const;
