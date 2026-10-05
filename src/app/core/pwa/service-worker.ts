/**
 * Registers the hand-written Service Worker (public/sw.js).
 * A relative path keeps the SW scope aligned with <base href>.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker
      .register('sw.js')
      .catch((err) => console.warn('[SW] registration failed', err));

  // Register after load so SW install doesn't compete with first paint.
  if (document.readyState === 'complete') {
    void register();
  } else {
    window.addEventListener('load', () => void register(), { once: true });
  }
}

/** Asks the SW to drop the cached credential list (called on logout). */
export async function clearOfflineCredentialCache(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: 'CLEAR_CREDENTIAL_CACHE' });
  } catch {
    /* no SW - nothing cached */
  }
}
