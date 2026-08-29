import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDragSlider } from '@/src/hooks/useDragSlider';
import { useCoarsePointer, useReducedMotion } from '@/src/hooks/useMediaQuery';

/**
 * Colour language shared by the calculator sliders.
 *
 * `ramp` paints the whole track from "bad" on the left to "good" on the right
 * and is revealed left-to-right, so the colour under the thumb always means the
 * same thing at the same position. `accent` is the current verdict — it drives
 * the thumb, its glow and the value bubble.
 *
 * Colour is never the only signal: every slider using this also renders the
 * value in text and a short label next to it.
 */
export interface SliderTone {
  /** Full-width positional gradient for the filled part of the track. */
  ramp: string;
  /** Solid colour for the thumb ring, glow and value bubble. */
  accent: string;
  /** Translucent form of `accent`, for the halo behind the track. */
  glow: string;
}

/**
 * Red → amber → green: "more of this is safer". The stops line up with the
 * deposit bands the mortgage calculator labels (under 10% risky, 10–20% fair,
 * 20%+ strong), so the colour at the thumb agrees with the words under it.
 */
export const RISK_RAMP =
  'linear-gradient(90deg, #EF4444 0%, #F97316 6%, #F59E0B 12%, #FACC15 16%, #A3E635 20%, #22C55E 28%, #059669 70%)';

export const TONE_BAD: Pick<SliderTone, 'accent' | 'glow'> = { accent: '#EF4444', glow: 'rgba(239,68,68,0.32)' };
export const TONE_WARN: Pick<SliderTone, 'accent' | 'glow'> = { accent: '#F59E0B', glow: 'rgba(245,158,11,0.32)' };
export const TONE_GOOD: Pick<SliderTone, 'accent' | 'glow'> = { accent: '#10B981', glow: 'rgba(16,185,129,0.32)' };

/** Fixed marker drawn on the track (e.g. the rent-vs-buy break-even year). */
export interface SliderTick {
  /** Position along the track, 0–100. */
  percent: number;
  /** Tooltip text — ticks carry meaning, so they always get one. */
  title: string;
}

export interface TouchSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  tone: SliderTone;
  /** Accessible name and spoken value. */
  ariaLabel: string;
  valueText: string;
  /** Short text shown in the bubble that follows the thumb while dragging. */
  bubbleLabel?: string;
  /** Ornament inside the thumb (emoji or icon). */
  icon?: React.ReactNode;
  ticks?: SliderTick[];
  /** Keeps the slider in its "lit" state from outside (e.g. a linked input). */
  active?: boolean;
  id?: string;
  className?: string;
}

/** Thumb diameter: fingers get a target that clears the 44px touch guideline. */
const THUMB_COARSE = 34;
const THUMB_FINE = 28;
/** Full height of the drag surface — the whole row is grabbable, not just the bar. */
const ROW_COARSE = 'h-16';
const ROW_FINE = 'h-12';
/** Visible bar thickness. */
const BAR_COARSE = 'h-4';
const BAR_FINE = 'h-3';

/** How long the thumb stays enlarged after release, so the gesture "lands". */
const REST_DELAY_MS = 700;
/** iOS-ish settle: quick out, soft finish. */
const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * The calculators' slider: a full-row drag surface, a finger-sized thumb, and a
 * track whose colour states whether the current value is a good or a bad place
 * to be. Pointer behaviour (press-anywhere, grab-the-thumb, haptics, rAF
 * coalescing) lives in `useDragSlider`.
 */
const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  onDragStart,
  onDragEnd,
  disabled = false,
  tone,
  ariaLabel,
  valueText,
  bubbleLabel,
  icon,
  ticks,
  active = false,
  id,
  className = '',
}) => {
  const coarse = useCoarsePointer();
  const reducedMotion = useReducedMotion();
  const thumbSize = coarse ? THUMB_COARSE : THUMB_FINE;

  // "Lit" state lingers past the release so the thumb settles instead of
  // snapping back the instant the finger lifts.
  const [lingering, setLingering] = useState(false);
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus ring modality. The hook focuses the track on pointerdown (so a blur
  // ends the drag and the arrow keys work straight after a tap), and Chrome
  // scores that programmatic focus as :focus-visible — which drew a ring around
  // the whole row on every touch. Track how focus arrived instead.
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const focusFromPointer = useRef(false);

  const handleStart = useCallback(() => {
    if (restTimer.current) clearTimeout(restTimer.current);
    setLingering(true);
    onDragStart?.();
  }, [onDragStart]);

  const handleEnd = useCallback(() => {
    if (restTimer.current) clearTimeout(restTimer.current);
    restTimer.current = setTimeout(() => setLingering(false), REST_DELAY_MS);
    onDragEnd?.();
  }, [onDragEnd]);

  useEffect(() => () => { if (restTimer.current) clearTimeout(restTimer.current); }, []);

  const { isDragging, offset, trackProps } = useDragSlider({
    value,
    min,
    max,
    step,
    onChange,
    onDragStart: handleStart,
    onDragEnd: handleEnd,
    disabled,
    thumbSize,
    'aria-label': ariaLabel,
    valueText,
  });

  const handlePointerDownCapture = useCallback(() => {
    focusFromPointer.current = true;
    setKeyboardFocus(false);
  }, []);

  const handleFocus = useCallback(() => {
    setKeyboardFocus(!focusFromPointer.current);
    focusFromPointer.current = false;
  }, []);

  const handleBlur = useCallback(() => {
    focusFromPointer.current = false;
    setKeyboardFocus(false);
    trackProps.onBlur();
  }, [trackProps]);

  const lit = active || lingering || isDragging;
  // While the finger is down the thumb must sit exactly under it — any easing
  // there reads as lag. Easing is only for the settle after release.
  const follow = isDragging ? 'none' : `left 120ms ${SETTLE}`;

  return (
    <div className={`relative ${className}`}>
      {/* Value bubble — rides above the thumb during the gesture, the way a
          native slider's tooltip does, so the finger never hides the number. */}
      {bubbleLabel && (
        <div
          aria-hidden="true"
          className="absolute bottom-full z-20 pointer-events-none"
          style={{
            left: offset,
            transform: `translate(-50%, ${isDragging || lingering ? '-4px' : '2px'}) scale(${isDragging || lingering ? 1 : 0.85})`,
            opacity: isDragging || lingering ? 1 : 0,
            transition: isDragging
              ? `opacity 120ms linear, transform 160ms ${SETTLE}`
              : `left 120ms ${SETTLE}, opacity 200ms linear, transform 200ms ${SETTLE}`,
            willChange: 'left, transform, opacity',
          }}
        >
          <span
            className="block rounded-lg px-2 py-1 text-[11px] font-bold text-white whitespace-nowrap tabular-nums shadow-lg"
            style={{ backgroundColor: tone.accent, boxShadow: `0 6px 18px ${tone.glow}` }}
          >
            {bubbleLabel}
          </span>
          <span
            className="block w-2 h-2 mx-auto -mt-1 rotate-45 rounded-[2px]"
            style={{ backgroundColor: tone.accent }}
          />
        </div>
      )}

      {/*
        * The whole row is the drag surface (pointer events, see useDragSlider):
        * press anywhere and the thumb follows the finger, and the extra height
        * means a thumb-press doesn't have to be pixel-accurate vertically.
        */}
      <div
        {...trackProps}
        id={id}
        onPointerDownCapture={handlePointerDownCapture}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`relative ${coarse ? ROW_COARSE : ROW_FINE} flex items-center outline-none rounded-2xl`}
        style={{
          ...trackProps.style,
          boxShadow: keyboardFocus ? `0 0 0 2px #fff, 0 0 0 4px ${tone.accent}` : undefined,
        }}
      >
        {/* Track */}
        <div
          className={`relative w-full ${coarse ? BAR_COARSE : BAR_FINE} rounded-full bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden pointer-events-none`}
        >
          {/* Filled part. The gradient spans the whole track and is revealed by
              a clip, so a given colour always sits at the same position — the
              hue reads as "where on the scale am I", not as decoration. */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: tone.ramp,
              clipPath: `inset(0 calc(100% - ${offset}) 0 0 round 9999px)`,
              transition: isDragging ? 'none' : `clip-path 120ms ${SETTLE}, background 200ms linear`,
              willChange: 'clip-path',
            }}
          />

          {/* Meaningful positions on the scale (e.g. break-even). */}
          {ticks?.map((tick) => (
            <span
              key={`${tick.percent}-${tick.title}`}
              title={tick.title}
              className="absolute top-0 bottom-0 w-[2px] rounded-full bg-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.15)]"
              style={{ left: `${Math.min(100, Math.max(0, tick.percent))}%` }}
            />
          ))}

          {/* Glass highlight */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 pointer-events-none z-10"
          style={{
            left: offset,
            transform: `translate(-50%, -50%) scale(${isDragging ? 1.15 : lit ? 1.08 : 1})`,
            willChange: 'left, transform',
            transition: `${follow}, transform 180ms ${SETTLE}`,
          }}
        >
          <div
            className="relative rounded-full bg-white flex items-center justify-center"
            style={{
              width: thumbSize,
              height: thumbSize,
              // Pressed state is a ring, not a cloud: it shows the enlarged
              // target without smearing colour over the track.
              boxShadow: lit
                ? `0 0 0 ${isDragging ? 9 : 6}px ${tone.glow}, 0 3px 10px rgba(0,0,0,0.18)`
                : '0 2px 8px rgba(0,0,0,0.18)',
              transition: reducedMotion ? 'none' : 'box-shadow 200ms ease-out',
            }}
          >
            {/* Inner disc carries the verdict colour. */}
            <div
              className="absolute inset-[3px] rounded-full"
              style={{
                background: `linear-gradient(145deg, ${tone.accent}, ${tone.accent}CC)`,
                transition: 'background 200ms linear',
              }}
            />
            {icon && <span className="relative leading-none text-white drop-shadow-sm">{icon}</span>}
            {/* Shine */}
            <div className="absolute top-[3px] left-[6px] w-2 h-2 bg-white/45 rounded-full blur-[2px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouchSlider;
