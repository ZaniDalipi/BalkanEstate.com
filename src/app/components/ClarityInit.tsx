import { useEffect } from 'react';

declare global {
  interface Window {
    clarity: (...args: unknown[]) => void;
  }
}

/**
 * Microsoft Clarity initialization component
 * Provides heatmaps, session recordings, and user behavior analytics
 * Dashboard: https://clarity.microsoft.com
 *
 * Only runs in production (when VITE_CLARITY_PROJECT_ID is set via GitHub Actions)
 */
const ClarityInit: React.FC = () => {
  useEffect(() => {
    const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    const isDev = import.meta.env.DEV;

    // Debug logging
    console.log('[Clarity] DEV mode:', isDev);
    console.log('[Clarity] Project ID:', clarityId ? '✓ Found' : '✗ Not set');

    // Only run in production mode
    if (isDev) {
      console.log('[Clarity] Skipping - running in development mode');
      return;
    }

    // Skip if no project ID configured
    if (!clarityId || clarityId === 'YOUR_PROJECT_ID') {
      console.warn('[Clarity] Skipping - invalid or missing project ID');
      return;
    }

    // Check if Clarity is already loaded
    if (window.clarity) {
      console.log('[Clarity] Already loaded, skipping');
      return;
    }

    console.log('[Clarity] Initializing with project ID...');

    // Initialize Clarity
    (function(c: Window, l: Document, a: string, r: string, i: string) {
      (c as Window & { [key: string]: unknown })[a] = (c as Window & { [key: string]: unknown })[a] || function(...args: unknown[]) {
        ((c as Window & { [key: string]: unknown })[a] as { q?: unknown[] }).q = ((c as Window & { [key: string]: unknown })[a] as { q?: unknown[] }).q || [];
        ((c as Window & { [key: string]: unknown })[a] as { q: unknown[] }).q.push(args);
      };
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = "https://www.clarity.ms/tag/" + i;
      t.onload = () => console.log('[Clarity] Script loaded successfully');
      t.onerror = () => console.error('[Clarity] Failed to load script');
      const y = l.getElementsByTagName(r)[0];
      y.parentNode?.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
  }, []);

  return null;
};

export default ClarityInit;
