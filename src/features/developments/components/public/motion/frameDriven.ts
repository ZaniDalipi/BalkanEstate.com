/**
 * Spread onto a motion component to animate it frame by frame on the main
 * thread instead of as a native browser animation.
 *
 * framer-motion ends a native (WAAPI) animation by cancelling it and writing
 * the final value to the element on its next frame. In between, the element
 * shows the value it had before the animation: on a small element nobody
 * notices, but on a full-screen layer it is a one-frame flash — the coloured
 * building blinking through the white model as it fades in, a closed showcase
 * blinking back after it faded out. A callback on every frame keeps framer on
 * its own frame loop (it must report each value), where the element's style
 * always holds the current value, so these layers never blink.
 */
export const FRAME_DRIVEN = { onUpdate: () => undefined } as const;
