import { useMemo, useRef } from 'react';

/**
 * A tap that resolves on the finger lifting, not on the browser's click.
 *
 * `onClick` is the right default almost everywhere, but it is the wrong tool
 * for a small control at the edge of the screen — the back button being the
 * one people notice. Three things sit between a finger and a `click` there:
 *
 *   - the browser only synthesises a click if the press *and* the release land
 *     on the same element, so a few pixels of drift off a 44px target loses
 *     the tap silently and the button reads as broken;
 *   - a `touchmove` that another handler calls `preventDefault()` on — the
 *     edge swipe-back gesture, which starts in the same 28px strip the back
 *     button lives in — cancels the click outright;
 *   - the click arrives a frame or two after the release regardless.
 *
 * So the press is tracked directly. The pointer is captured on the way down,
 * which means the release is reported to this element wherever the finger
 * actually ends up, and a release within `RELEASE_SLOP_PX` of the control
 * still counts. A press that turns into a scroll or a drag is dropped, and the
 * click that the browser may still deliver afterwards is swallowed so nothing
 * fires twice.
 *
 * Returns props to spread onto a `<button>`; keyboard activation is untouched
 * and still arrives as an ordinary click.
 */

/** Finger drift during the press that still counts as a tap, in px. */
const MOVE_SLOP_PX = 12;

/** How far outside the control's box a release still counts, in px. */
const RELEASE_SLOP_PX = 24;

/** A click arriving this soon after a handled tap is the same gesture. */
const CLICK_DEDUPE_MS = 700;

interface TapState {
  pointerId: number;
  startX: number;
  startY: number;
  armed: boolean;
  firedAt: number;
}

export interface FastTapProps {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function useFastTap(onTap: () => void): FastTapProps {
  const state = useRef<TapState>({ pointerId: -1, startX: 0, startY: 0, armed: false, firedAt: 0 });

  // The handler is read through a ref so the returned props are stable: a
  // caller that rebuilds its callback every render must not detach and
  // reattach listeners mid-press.
  const handler = useRef(onTap);
  handler.current = onTap;

  return useMemo<FastTapProps>(() => {
    const disarm = () => {
      state.current.armed = false;
      state.current.pointerId = -1;
    };

    const fire = () => {
      state.current.firedAt = Date.now();
      disarm();
      handler.current();
    };

    return {
      onPointerDown: (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        state.current.pointerId = event.pointerId;
        state.current.startX = event.clientX;
        state.current.startY = event.clientY;
        state.current.armed = true;
        // Capture so the release is delivered here even if the finger slides
        // off. Some environments (and jsdom) have no capture API; the press
        // still works, it is just less forgiving about where it ends.
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          /* capture is an optimisation, never a requirement */
        }
      },

      onPointerMove: (event) => {
        if (!state.current.armed || event.pointerId !== state.current.pointerId) return;
        if (
          Math.abs(event.clientX - state.current.startX) > MOVE_SLOP_PX ||
          Math.abs(event.clientY - state.current.startY) > MOVE_SLOP_PX
        ) {
          // The gesture became a scroll or a drag — it is no longer a tap.
          disarm();
        }
      },

      onPointerUp: (event) => {
        if (!state.current.armed || event.pointerId !== state.current.pointerId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < rect.left - RELEASE_SLOP_PX ||
          event.clientX > rect.right + RELEASE_SLOP_PX ||
          event.clientY < rect.top - RELEASE_SLOP_PX ||
          event.clientY > rect.bottom + RELEASE_SLOP_PX;
        if (outside) {
          disarm();
          return;
        }
        fire();
      },

      onPointerCancel: disarm,

      onClick: () => {
        // Keyboard activation and any environment where the pointer sequence
        // did not run still land here; a click trailing a tap we already
        // handled does not.
        if (Date.now() - state.current.firedAt < CLICK_DEDUPE_MS) return;
        fire();
      },
    };
  }, []);
}
