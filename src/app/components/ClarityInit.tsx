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
    // Only run in production mode
    if (import.meta.env.DEV) {
      return;
    }

    const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;

    // Skip if no project ID configured
    if (!clarityId || clarityId === 'YOUR_PROJECT_ID') {
      return;
    }

    // Check if Clarity is already loaded
    if (window.clarity) {
      return;
    }

    // Initialize Clarity
    (function(c: Window, l: Document, a: string, r: string, i: string) {
      (c as Window & { [key: string]: unknown })[a] = (c as Window & { [key: string]: unknown })[a] || function(...args: unknown[]) {
        ((c as Window & { [key: string]: unknown })[a] as { q?: unknown[] }).q = ((c as Window & { [key: string]: unknown })[a] as { q?: unknown[] }).q || [];
        ((c as Window & { [key: string]: unknown })[a] as { q: unknown[] }).q.push(args);
      };
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = "https://www.clarity.ms/tag/" + i;
      const y = l.getElementsByTagName(r)[0];
      y.parentNode?.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
  }, []);

  return null;
};

export default ClarityInit;
