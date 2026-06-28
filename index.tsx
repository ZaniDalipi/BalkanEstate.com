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

// Reload at most once within a short window to recover from stale chunks
// after a deploy. Without this guard a persistently-stale page (e.g. a
// service worker serving a precached index.html that references old hashed
// filenames) would reload, hit the same failure, and reload again forever —
// the cause of the visible "page keeps refreshing" loop. Mirrors the guard
// in src/app/components/ErrorBoundary.tsx.
const recoverViaReload = () => {
  try {
    const key = 'be:auto-reload';
    const last = Number(sessionStorage.getItem(key) || '0');
    // Already reloaded recently → reloading won't help (HTML still stale).
    // Bail and let the in-app ErrorBoundary render a fallback instead.
    if (last && Date.now() - last < 30000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode / blocked storage): fall
    // through and reload once, accepting we can't track loops here.
  }
  window.location.reload();
};

// Hard recovery for the "app won't load" case: a stale service worker serving a
// precached index.html that references hashed chunk filenames which 404 on the
// server (the browser then gets text/html for a module script and the app can't
// boot). A plain reload re-serves the same stale HTML, so here we first tear down
// the service worker and all caches, then reload to fetch a clean bundle.
const hardRecover = async () => {
  try {
    const key = 'be:hard-recover';
    const last = Number(sessionStorage.getItem(key) || '0');
    if (last && Date.now() - last < 30000) return; // already tried recently
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore storage failures and attempt recovery once
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best-effort cleanup; reload regardless
  }
  window.location.reload();
};

// Reload when a lazy-loaded chunk fails (e.g. stale page referencing old
// hashed filenames after a new deploy). Vite 5+ fires this before throwing.
window.addEventListener('vite:preloadError', () => {
  hardRecover();
});

// A failed ES module script load surfaces as a window "error" event whose target
// is the <script>. This is the "Expected a JavaScript module but got text/html"
// case — a missing chunk served as the SPA fallback. Self-heal the same way.
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'SCRIPT' && (target as HTMLScriptElement).type === 'module') {
      hardRecover();
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
