import { useEffect, useState } from 'react';

const SESSION_KEY = 'adPreviewMode';

export interface AdPreviewState {
  /** Preview mode highlights every ad slot so positions are easy to find. */
  active: boolean;
  /** Placement to scroll to / emphasise, from the ?adFocus= param (if any). */
  focus: string | null;
}

/**
 * Reads ad-preview intent from the URL (?adPreview=1&adFocus=<placement>) and
 * persists it for the browsing session, so links from the admin light up the
 * ad slots on the live site and keep them lit as the user navigates around.
 */
export function useAdPreview(): AdPreviewState {
  const [state, setState] = useState<AdPreviewState>({ active: false, focus: null });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('adPreview') === '1') {
        sessionStorage.setItem(SESSION_KEY, '1');
      }
      const active = sessionStorage.getItem(SESSION_KEY) === '1';
      setState({ active, focus: params.get('adFocus') });
    } catch {
      /* ignore */
    }

    const onChange = () => {
      try {
        setState((s) => ({ ...s, active: sessionStorage.getItem(SESSION_KEY) === '1' }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('ad-preview-change', onChange);
    return () => window.removeEventListener('ad-preview-change', onChange);
  }, []);

  return state;
}

/** Turn preview mode off for the session. */
export function exitAdPreview(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('ad-preview-change'));
  } catch {
    /* ignore */
  }
}
