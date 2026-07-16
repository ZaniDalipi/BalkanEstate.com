import { useEffect, useRef, useState } from 'react';

/**
 * Pauses purely-decorative animations when their container is scrolled out of
 * the viewport. Returns a ref to attach to the container and a boolean that is
 * true while the element is off-screen — combine it with the
 * `decorative-offscreen` CSS class (see src/index.css) which sets
 * `animation-play-state: paused` on the subtree.
 *
 * Pausing (vs. unmounting) means the animation resumes instantly with no layout
 * cost when the element scrolls back into view, while the GPU stays idle in
 * between. Used for always-on ambient effects like the footer cityscape.
 */
export function usePauseWhenOffscreen<T extends HTMLElement = HTMLDivElement>(
  rootMargin = '200px'
) {
  const ref = useRef<T | null>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, offscreen };
}
