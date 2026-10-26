import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'digu_custom_backend_url';

/**
 * Default public production/tunnel backend URL for mobile APKs.
 * Can be overridden in in-game settings.
 */
export const DEFAULT_MOBILE_BACKEND_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'https://creation-search-watches-collapse.trycloudflare.com';

/**
 * Returns whether the app is running as a native mobile shell (Android/iOS) via Capacitor.
 */
export function isNativeMobile(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Gets the configured backend HTTP/HTTPS base URL.
 * Handles native mobile localhost edge cases and custom user overrides.
 */
export function getBackendBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080';
  }

  // 1. Check custom user override in localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {}

  // 2. If running inside native Android/iOS Capacitor shell, use remote backend
  if (isNativeMobile()) {
    return DEFAULT_MOBILE_BACKEND_URL.replace(/\/+$/, '');
  }

  // 3. Browser environment
  const { protocol, hostname, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // When dev server runs on 5173, backend server runs on 8080
    return `${protocol}//${hostname}:8080`;
  }

  // Live web tunnel / domain
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

/**
 * Updates and persists the custom backend base URL in localStorage.
 */
export function setBackendBaseUrl(url: string): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch {}
}

/**
 * Resets backend to the platform default.
 */
export function resetBackendBaseUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Derives the WebSocket connection URL from the backend HTTP/HTTPS base URL.
 */
export function getWsBaseUrl(): string {
  const httpUrl = getBackendBaseUrl();
  const wsProtocol = httpUrl.startsWith('https:') ? 'wss:' : 'ws:';
  const cleanUrl = httpUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}//${cleanUrl}/ws`;
}

/**
 * Derives the REST API endpoint base URL.
 */
export function getApiBaseUrl(): string {
  return getBackendBaseUrl();
}
