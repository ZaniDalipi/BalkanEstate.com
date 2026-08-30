import { useEffect, useState } from 'react';

/** Read a media query once, defensively (SSR and jsdom have no matchMedia). */
function readQuery(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Subscribes to a CSS media query from JS.
 *
 * Used where a breakpoint alone can't express the rule — e.g. slider geometry
 * has to be a real number (thumb diameter in px) that the pointer maths uses,
 * not just a class name.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readQuery(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(query);
    } catch {
      return;
    }

    const onChange = () => setMatches(mql.matches);
    onChange(); // resync in case the query changed between render and effect

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14 only has the deprecated listener API.
    if (typeof mql.addListener === 'function') {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
    return;
  }, [query]);

  return matches;
}

/**
 * True when the primary input is a fingertip (phones, tablets) rather than a
 * mouse. A fingertip covers ~9mm of screen, so controls it drives need ~44px
 * of target where a cursor is happy with 20px.
 */
export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/** True when the visitor asked the OS to reduce motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useMediaQuery;
