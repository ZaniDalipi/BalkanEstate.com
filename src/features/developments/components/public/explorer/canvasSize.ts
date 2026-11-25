import type React from 'react';

/**
 * How big the explorer picture is drawn. Full screen: fit the viewport. On the
 * page: leave room for the page bar, crumbs and building chips above the
 * picture (≈18rem) so the whole picture, zoom buttons included, fits on
 * screen, but never below 20rem tall. Phones: see PHONE_CANVAS_WIDTH.
 */
export const canvasSize = (W: number, H: number, fullscreen?: boolean): React.CSSProperties =>
  fullscreen
    ? { aspectRatio: `${W} / ${H}`, width: `min(100vw, calc(100dvh * ${W / H}))` }
    : {
        aspectRatio: `${W} / ${H}`,
        width: `min(100%, calc(max(20rem, min(80dvh, 100dvh - 18rem)) * ${W / H}))`,
        // Read by PHONE_CANVAS_WIDTH, which sizes the picture by height on phones.
        ['--canvas-ratio' as string]: W / H,
      };

/**
 * Phones (page, not full screen): the picture is drawn tall, 56% of the screen's
 * height (at most 26rem), and as wide as that makes it — wider than the screen
 * for a landscape picture, so the buyer swipes sideways to look around instead
 * of squinting at a 250px strip. Never narrower than the screen.
 */
export const PHONE_CANVAS_WIDTH = 'max-sm:w-[max(100%,calc(min(56svh,26rem)*var(--canvas-ratio)))]!';
