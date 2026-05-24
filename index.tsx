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
// Reload when a lazy-loaded chunk fails (e.g. stale page referencing old
// hashed filenames after a new deploy). Vite 5+ fires this before throwing.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

if ('serviceWorker' in navigator) {
  // When a new SW takes control (skipWaiting + clientsClaim), any lazy-loaded
  // chunks cached under old content-hash URLs become unreachable. Reload
  // proactively so the user gets the new bundle cleanly rather than hitting
  // a chunk-load error. The prevController guard prevents a spurious reload
  // on first install (controller: null → SW).
  const prevController = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (prevController) {
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({ immediate: true });
    } catch {
      // SW registration is non-critical — silently ignore errors
    }
  });
}
