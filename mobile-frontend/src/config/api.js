// mobile-frontend/src/config/api.js
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let cachedBaseUrl = null;
const DEFAULT_BACKEND = 'https://backend-8kxl.onrender.com';
export const API_BASE_URL = `${DEFAULT_BACKEND}/api`;

export async function getApiBaseUrl() {
  try {
    if (cachedBaseUrl) return cachedBaseUrl;

    // 1) Allow explicit runtime override (full URL or host) via multiple avenues.
    // - Expo config extra: Constants.manifest?.extra?.BACKEND_URL
    // - process.env.BACKEND_URL (Metro env injection)
    // - global.__BACKEND_URL__ (set this from app entry if desired)
    const override =
      (Constants && Constants.manifest && Constants.manifest.extra && Constants.manifest.extra.BACKEND_URL) ||
      process.env.BACKEND_URL ||
      global.__BACKEND_URL__ ||
      null;

    if (override) {
      // If override already contains protocol, use as-is (ensure trailing /api)
      const hasProtocol = /^https?:\/\//i.test(override);
      if (hasProtocol) {
        cachedBaseUrl = override.replace(/\/+$/, '');
        if (!cachedBaseUrl.endsWith('/api')) cachedBaseUrl = `${cachedBaseUrl}/api`;
        console.log('🌐 Backend (override):', cachedBaseUrl);
        return cachedBaseUrl;
      }

      // If override is like 'host:port' or 'host', build full http url
      const portFromOverride = override.includes(':') ? override.split(':').pop() : '5000';
      const hostFromOverride = override.includes(':') ? override.split(':')[0] : override;
      cachedBaseUrl = `http://${hostFromOverride}:${portFromOverride}/api`;
      console.log('🌐 Backend (override host):', cachedBaseUrl);
      return cachedBaseUrl;
    }

    // No override provided — use the provided Render backend by default.
    cachedBaseUrl = `${DEFAULT_BACKEND}/api`;
    console.log('🌐 Backend (default):', cachedBaseUrl);
    return cachedBaseUrl;
  } catch (err) {
    console.warn('⚠️ Fallback to localhost:', err);
    // If an override exists but something failed above, use it (best-effort)
    const fallbackOverride =
      (Constants && Constants.manifest && Constants.manifest.extra && Constants.manifest.extra.BACKEND_URL) ||
      process.env.BACKEND_URL ||
      global.__BACKEND_URL__;
    if (fallbackOverride) {
      return /^https?:\/\//i.test(fallbackOverride)
        ? (fallbackOverride.endsWith('/api') ? fallbackOverride : `${fallbackOverride.replace(/\/+$/, '')}/api`)
        : `http://${fallbackOverride.replace(/\/+$/, '')}/api`;
    }
    return `${DEFAULT_BACKEND}/api`;
  }
}

export async function apiFetch(path, options = {}) {
  const base = await getApiBaseUrl();
  const url = base + path;
  return fetch(url, options);
}

export async function checkNetworkConnection() {
  try {
    const base = await getApiBaseUrl();
    const healthUrl = base.replace(/\/+$/, '') + '/health';
    const res = await fetch(healthUrl, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch (err) {
    console.warn('Network check failed:', err);
    return false;
  }
}

export async function getNetworkInfo() {
  try {
    const state = await Network.getNetworkStateAsync();
    return {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
      ipAddress: await Network.getIpAddressAsync(),
    };
  } catch (err) {
    console.error('Network info error:', err);
    return null;
  }
}
