import { useEffect, useState } from 'react';
import type React from 'react';

/**
 * True once `ref`'s element has scrolled up behind the top `offsetPx`
 * (a sticky bar). Off-screen *below* the viewport does not count.
 */
export function useScrolledPast(ref: React.RefObject<HTMLElement | null>, offsetPx = 56): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < offsetPx),
      { rootMargin: `-${offsetPx}px 0px 0px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, offsetPx]);
  return past;
}
