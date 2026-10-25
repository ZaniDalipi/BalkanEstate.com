import type React from 'react';

/**
 * How big the explorer picture is drawn. Full screen: fit the viewport. On the
 * page: leave room for the page bar, crumbs and building chips above the
 * picture (≈18rem) so the whole picture, zoom buttons included, fits on
 * screen, but never below 20rem tall.
 */
export const canvasSize = (W: number, H: number, fullscreen?: boolean): React.CSSProperties =>
  fullscreen
    ? { aspectRatio: `${W} / ${H}`, width: `min(100vw, calc(100dvh * ${W / H}))` }
    : { aspectRatio: `${W} / ${H}`, width: `min(100%, calc(max(20rem, min(80dvh, 100dvh - 18rem)) * ${W / H}))` };
