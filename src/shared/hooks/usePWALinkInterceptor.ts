import { useEffect } from 'react';
import { isPWA } from '../utils/pwa';

const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'sms:', '#'];

/**
 * When running as an installed PWA, intercepts clicks on internal <a href> links
 * and routes them through the app's SPA router (pushState + popstate) so the OS
 * never opens a second browser window. External links, tel:, mailto:, and
 * explicit target="_blank" anchors are left untouched.
 */
export function usePWALinkInterceptor(): void {
  useEffect(() => {
    if (!isPWA()) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Leave external links, hash anchors, and explicit new-tab links alone
      if (
        EXTERNAL_PREFIXES.some(p => href.startsWith(p)) ||
        anchor.target === '_blank'
      ) return;

      e.preventDefault();
      window.history.pushState({}, '', href);
      // Trigger the app's popstate-based router
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}
