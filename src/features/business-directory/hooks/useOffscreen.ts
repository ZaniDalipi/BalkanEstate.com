import { useEffect, useState } from 'react';

/**
 * True while `element` is entirely outside the viewport, above or below.
 * Pass the element from a callback ref (`ref={setElement}`), so the observer
 * follows it when it unmounts and mounts again. False while there is no
 * element and until the first observation, so nothing flashes in on mount.
 */
export function useOffscreen(element: HTMLElement | null): boolean {
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    setOffscreen(false);
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return offscreen;
}
