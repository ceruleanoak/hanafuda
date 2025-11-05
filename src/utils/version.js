/**
 * Version utility for cache busting
 *
 * The version is injected at build time by Vite from git commit hash.
 * This ensures that asset URLs change with each deployment, forcing
 * browsers to fetch fresh content instead of using stale cached versions.
 */

// Global version constant injected by Vite at build time
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

/**
 * Adds version parameter to asset URL for cache busting
 * @param {string} url - The asset URL (relative or absolute)
 * @returns {string} - URL with version parameter appended
 */
export function versionedUrl(url) {
  if (!url) return url;

  // Check if URL already has query parameters
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}v=${APP_VERSION}`;
}

/**
 * Log version to console for debugging
 */
export function logVersion() {
  console.log(`[Hanafuda] App version: ${APP_VERSION}`);
}
