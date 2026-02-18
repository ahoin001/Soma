/**
 * Session-expired callback for PWA/Capacitor: when any API returns 401 we clear
 * storage and notify the auth layer so the app shows the sign-in screen instead
 * of an error screen or stale data.
 */

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredCallback(callback: (() => void) | null) {
  onSessionExpired = callback;
}

export function notifySessionExpired() {
  onSessionExpired?.();
}
