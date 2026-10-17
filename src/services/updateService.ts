import { APP_VERSION_CONFIG, AppUpdateInfo } from '../config/versionConfig';

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

    // 2. If manifest fetch failed, fallback to public GitHub Releases API
    if (!manifest) {
      try {
        const ghRes = await fetch(APP_VERSION_CONFIG.githubApiUrl, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const tagName = String(ghData.tag_name || '').replace(/^v/, '');
          const apkAsset = ghData.assets?.find((a: { name: string }) =>
            a.name.endsWith('.apk')
          );

          manifest = {
            versionName: tagName || APP_VERSION_CONFIG.versionName,
            versionCode: APP_VERSION_CONFIG.versionCode + 1, // Assume newer if a newer release tag exists
            releaseDate: ghData.published_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            downloadUrl: apkAsset?.browser_download_url || APP_VERSION_CONFIG.directApkUrl,
            isMandatory: false,
            releaseNotes: ghData.body
              ? ghData.body.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 5)
              : ['Performance improvements and bug fixes'],
          };
        }
      } catch {
        // Network offline or GitHub rate limit
      }
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
  const url = downloadUrl || APP_VERSION_CONFIG.directApkUrl;
  try {
    // Try opening via window.open with _system for Capacitor / mobile browsers
    const target = window.open(url, '_system');
    if (!target) {
      // Fallback: create temporary DOM anchor
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Holhuashi-Digu.apk';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
