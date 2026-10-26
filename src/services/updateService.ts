import { APP_VERSION_CONFIG, AppUpdateInfo } from '../config/versionConfig';
import { Capacitor } from '@capacitor/core';

const LAST_CHECK_KEY = 'holhuashi_last_update_check';
const DISMISSED_VERSION_KEY = 'holhuashi_dismissed_update_version';
const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours cooldown between automatic background checks

export interface CheckUpdateResult {
  hasUpdate: boolean;
  updateInfo: AppUpdateInfo | null;
  error?: string;
}

export async function checkForAppUpdate(forceManualCheck = false): Promise<CheckUpdateResult> {
  try {
    // Check cooldown for background auto-checks
    if (!forceManualCheck) {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck && Date.now() - Number(lastCheck) < CHECK_COOLDOWN_MS) {
        return { hasUpdate: false, updateInfo: null };
      }
    }

    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    let manifest: AppUpdateInfo | null = null;

    // 1. Try fetching the local/CDN hosted version.json with cache busting
    try {
      const res = await fetch(`${APP_VERSION_CONFIG.manifestUrl}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        manifest = await res.json();
      }
    } catch {
      // Fallback below
    }

    // 2. Default store-compliant fallback if remote manifest is unreachable
    if (!manifest) {
      const platform = Capacitor.getPlatform();
      const defaultStoreUrl =
        platform === 'ios'
          ? APP_VERSION_CONFIG.appStoreUrl
          : APP_VERSION_CONFIG.playStoreUrl;

      manifest = {
        versionName: APP_VERSION_CONFIG.versionName,
        versionCode: APP_VERSION_CONFIG.versionCode,
        releaseDate: new Date().toISOString().split('T')[0],
        downloadUrl: defaultStoreUrl,
        isMandatory: false,
        releaseNotes: ['General stability and performance improvements.'],
      };
    }

    if (!manifest) {
      return { hasUpdate: false, updateInfo: null, error: 'Could not connect to update server' };
    }

    // Check if remote version is strictly newer
    const isNewer =
      manifest.versionCode > APP_VERSION_CONFIG.versionCode ||
      (manifest.versionName !== APP_VERSION_CONFIG.versionName &&
        compareSemver(manifest.versionName, APP_VERSION_CONFIG.versionName) > 0);

    if (!isNewer) {
      return { hasUpdate: false, updateInfo: null };
    }

    // Check if user previously dismissed this exact update version (unless mandatory or manual check)
    if (!forceManualCheck && !manifest.isMandatory) {
      const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
      if (dismissed === manifest.versionName) {
        return { hasUpdate: false, updateInfo: null };
      }
    }

    return { hasUpdate: true, updateInfo: manifest };
  } catch (err) {
    return {
      hasUpdate: false,
      updateInfo: null,
      error: err instanceof Error ? err.message : 'Unknown error during update check',
    };
  }
}

export function dismissUpdate(versionName: string) {
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, versionName);
  } catch {
    // Ignore storage issues
  }
}

export function downloadAndInstallUpdate(downloadUrl?: string) {
  const platform = Capacitor.getPlatform();
  let defaultUrl: string;

  if (platform === 'android') {
    defaultUrl = APP_VERSION_CONFIG.playStoreMarketUrl;
  } else if (platform === 'ios') {
    defaultUrl = APP_VERSION_CONFIG.appStoreSchemeUrl;
  } else {
    defaultUrl = APP_VERSION_CONFIG.playStoreUrl;
  }

  const url = downloadUrl || defaultUrl;

  try {
    // Open in native system handler (Google Play app or App Store app)
    const target = window.open(url, '_system');
    if (!target) {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

function compareSemver(v1: string, v2: string): number {
  const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
  const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}
