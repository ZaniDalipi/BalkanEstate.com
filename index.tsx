// Polyfill for external scripts that may expect Laravel Ziggy routing
// This prevents "Can't find variable: Ziggy" errors from third-party scripts
declare global {
  interface Window {
    Ziggy?: {
      url: string;
      port: number | null;
      defaults: Record<string, unknown>;
      routes: Record<string, unknown>;
    };
    route?: (name: string, params?: Record<string, unknown>) => string;
  }
}

// Define Ziggy stub before any scripts run
if (typeof window !== 'undefined' && !window.Ziggy) {
  window.Ziggy = {
    url: window.location.origin,
    port: null,
    defaults: {},
    routes: {},
  };
  // Provide a stub route() function that returns the current URL
  window.route = (_name: string, _params?: Record<string, unknown>) => {
    return window.location.href;
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import Tailwind CSS (production build)
import './src/index.css';

// Initialize Sentry for error monitoring (deferred to avoid blocking LCP)
import { initSentry } from './src/lib/sentry';
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initSentry());
} else {
  setTimeout(initSentry, 0);
}

// Suppress console logs in production for security
import { suppressConsoleLogs } from './src/utils/logger';
suppressConsoleLogs();

// Initialize security measures
import { initSecurity } from './src/utils/security';
initSecurity();

// Dev-only: exposes __adsenseDebug() for checking the AdSense connection.
import { installAdsenseDebug } from './src/features/ads/adsDebug';
installAdsenseDebug();

// Initialize the performance / power governor. Sets classes on <html> that CSS
// uses to disable heavy decorative animations on mobile / reduced-motion and to
// pause ALL animation while the app is backgrounded — the main cause of the PWA
// heating up the device.
import { initPerfMode } from './src/utils/perfMode';
initPerfMode();

// Shared stale-deploy chunk recovery (unregister SW + clear caches + reload once)
import { recoverFromStaleChunk } from './src/utils/chunkRecovery';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const app = <App />;
root.render(
  import.meta.env.DEV ? <React.StrictMode>{app}</React.StrictMode> : app
);

// Register the service worker AFTER the page has loaded so it doesn't
// block the critical rendering path (LCP/FCP). VitePWA's injectRegister
// is set to null so we handle it manually here.

// Reload when a lazy-loaded chunk fails (e.g. stale page referencing old
// hashed filenames after a new deploy). Vite 5+ fires this before throwing.
// recoverFromStaleChunk tears down the SW + caches and reloads once (throttled),
// which is what a plain reload cannot do when a precached SW keeps serving the
// stale index.html that references the missing chunk hashes.
window.addEventListener('vite:preloadError', () => {
  recoverFromStaleChunk();
});

// A failed ES module script load surfaces as a window "error" event whose target
// is the <script>. This is the "Expected a JavaScript module but got text/html"
// case — a missing chunk served as the SPA fallback. Self-heal the same way.
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'SCRIPT' && (target as HTMLScriptElement).type === 'module') {
      recoverFromStaleChunk();
    }
  },
  true // capture phase: resource load errors don't bubble
);

if ('serviceWorker' in navigator) {
  // Register the SW after page load. The PWA uses registerType: 'prompt' (see
  // vite.config.ts), so vite-plugin-pwa does NOT attach an auto-reload listener
  // and skipWaiting/clientsClaim are off — an updated SW stays in "waiting" and
  // takes control on the user's next page open instead of reloading mid-session
  // (the production-only "screen refresh after a few seconds" users reported).
  // We never call the returned updateSW(), so no programmatic reload happens.
  // Actual stale-chunk failures are still handled above by the
  // `vite:preloadError` and `error` (module script) handlers, which only reload
  // when a chunk truly fails — not preemptively.
  window.addEventListener('load', async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      // immediate: false — defer registration until the load event has settled.
      registerSW({ immediate: false });
    } catch {
      // SW registration is non-critical — silently ignore errors
    }
  });
}
