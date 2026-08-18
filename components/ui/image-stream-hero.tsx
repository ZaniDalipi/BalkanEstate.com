"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── the corridor ────────────────────────────────────────────────
 * Two rails of cards ride from far behind the screen toward the
 * viewer. Perspective alone does the work that looks like two
 * animations: as a card's z grows it gets bigger *and* its screen x
 * sweeps outward from the vanishing point, because the projection
 * scales position and size by the same factor.
 *
 * Three things shape it, and each one fixes a specific artefact:
 *
 * 1. Depth is authored as *apparent size*, geometrically — each card
 *    is a constant ratio bigger than the one behind it, all the way
 *    out. Spacing a straight z-range evenly instead makes the near
 *    cards tear apart from each other as the projection blows up.
 * 2. The rails open hard in the first stretch and then hold
 *    (`fan` > 1). That opening cancels the — still slow — growth back
 *    there, so the ribbon leaves the centre as a flat band, bends
 *    once, and only then runs out on the diagonal. Parallel rails
 *    project to a straight cone with no bend at all.
 * 3. Neither end of the loop is ever on screen. A card dies with its
 *    inner edge past 50cqw, clear of the container's edge. And it is
 *    born *across* the axis — `railBirth` is negative, so the newest
 *    card starts on the far side and sweeps back through the centre.
 *    That plugs the throat: the axis stays covered at every instant,
 *    and a newborn lands behind cards that already cover it, so it
 *    needs no fade in. Birthing on its own side instead leaves a hole
 *    at dead centre that blinks open once every cycle.
 *
 * Every length is in `cqw` — a percentage of the container's width —
 * so the whole corridor keeps its proportions at any size. The
 * defaults were fitted numerically against a reference recording's
 * card-height and edge-position profile, not eyeballed.
 * ─────────────────────────────────────────────────────────────── */

/**
 * Geometry of the corridor. Every length is `cqw`, a percentage of the
 * container's width, so the shape is resolution-independent.
 *
 * These interact: the ribbon only stays solid while consecutive cards
 * overlap, which needs `exitHeight / birthHeight` spread over enough
 * `cards`. Raising `exitHeight`, dropping `cards`, or pulling `railExit`
 * in all push toward a visible tear near the frame edge.
 */
export type CorridorPath = {
  /** Strength of the projection. Lower is a wider-angle, more dramatic rush. @default 30 */
  perspective?: number;
  /** Card width in world units. @default 18 */
  cardWidth?: number;
  /** Card height in world units. @default 25 */
  cardHeight?: number;
  /** Corner radius applied to each card. @default 0.4 */
  cardRadius?: number;
  /** On-screen card height at the waist, where a card is born. @default 2.6 */
  birthHeight?: number;
  /** On-screen card height as a card leaves the frame. @default 46 */
  exitHeight?: number;
  /**
   * Lateral offset at birth. Negative starts the card across the axis so the
   * centre never opens up — see note 3 above. @default -11
   */
  railBirth?: number;
  /** Lateral offset once the rails have finished opening. @default 44 */
  railExit?: number;
  /** How front-loaded the opening is. >1 opens early then holds. @default 3.3 */
  fan?: number;
  /** Y-rotation at birth, degrees. @default 6 */
  turnBirth?: number;
  /** Y-rotation at exit, degrees. @default 28 */
  turnExit?: number;
  /** Keyframe stops used to trace the curve. Raise only if motion looks faceted. @default 24 */
  stops?: number;
};

const PATH: Required<CorridorPath> = {
  perspective: 30,
  cardWidth: 18,
  cardHeight: 25,
  cardRadius: 0.4,
  birthHeight: 2.6,
  exitHeight: 46,
  railBirth: -11,
  railExit: 44,
  fan: 3.3,
  turnBirth: 6,
  turnExit: 28,
  stops: 24,
};

/** Sample the path once so the CSS keyframes trace the real curve. */
function keyframes(dir: 1 | -1, name: string, p: Required<CorridorPath>) {
  const steps: string[] = [];
  for (let s = 0; s <= p.stops; s++) {
    const u = s / p.stops;
    // Geometric in apparent size, so consecutive cards keep a constant size
    // ratio and the ribbon stays solid at both ends.
    const scale =
      (p.birthHeight / p.cardHeight) *
      Math.pow(p.exitHeight / p.birthHeight, u);
    const z = p.perspective * (1 - 1 / scale);
    const rail =
      p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
    const turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
    steps.push(
      `${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(
        2,
      )}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`,
    );
  }
  return `@keyframes ${name}{${steps.join("")}}`;
}

export type StreamImage = {
  src: string;
  /** Only used if you drop the decorative treatment; the corridor is aria-hidden. */
  alt?: string;
  /** Announced on the card's button when `onImageSelect` makes the rails interactive. */
  label?: string;
  /** Short name printed on the card face — the place, not the full sentence. */
  caption?: string;
  /** Secondary line under the caption, e.g. the country. */
  sublabel?: string;
};

export type ImageStreamHeroProps = {
  /**
   * Images cycled onto the rails. Both rails run the same sequence, so the
   * corridor reads as one mirrored stream. Fewer than `cards` simply repeat.
   */
  images: StreamImage[];
  /**
   * Cards on each rail at once. More cards means a denser corridor, not a
   * faster one — spacing is derived from this and `speed`. Drop it far below
   * the default and consecutive cards grow too fast to stay overlapped near
   * the exit, which tears a gap in the ribbon.
   * @default 9
   */
  cards?: number;
  /**
   * Seconds for one card to travel the whole corridor.
   * @default 18
   */
  speed?: number;
  /**
   * Vertical placement of the corridor's axis, as a percentage of height.
   * @default 55
   */
  axis?: number;
  /** Override any part of the corridor geometry. Merged over the defaults. */
  path?: CorridorPath;
  /**
   * ── LOCAL ADDITION (not upstream) ───────────────────────────────
   * Opt into interactive rails. Omit it and the render path below is
   * identical to upstream: the corridor stays `aria-hidden` and
   * `pointer-events-none`, purely decorative.
   *
   * Passing it turns each card into a real `<button>` carrying its
   * image's `label`, so the rails are clickable *and* reachable by
   * keyboard. Receives the index into `images`.
   *
   * Kept additive so a future upstream bump stays a clean merge —
   * the three touch points are marked `LOCAL ADDITION`.
   * ───────────────────────────────────────────────────────────────
   */
  onImageSelect?: (index: number) => void;
  /** Content rendered above the corridor. */
  children?: React.ReactNode;
  className?: string;
};

export function ImageStreamHero({
  images,
  cards = 9,
  speed = 18,
  axis = 55,
  path,
  onImageSelect,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & ImageStreamHeroProps) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const right = `ish-r-${id}`;
  const left = `ish-l-${id}`;
  const card = `ish-c-${id}`;
  // LOCAL ADDITION: inner face (carries the hover lift) and its caption.
  const face = `ish-f-${id}`;
  const cap = `ish-p-${id}`;

  const p = React.useMemo(() => ({ ...PATH, ...path }), [path]);

  // LOCAL ADDITION: pointer-driven card picking (see the CSS note above).
  const cardEls = React.useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = React.useState<number | null>(null);
  const frame = React.useRef<number | null>(null);

  // Front-most card wins: nearer cards project to a larger rect, and the
  // slight Y-rotation keeps the quad close enough to its bounding box.
  const pickCard = React.useCallback((x: number, y: number) => {
    let best: number | null = null;
    let bestArea = 0;
    cardEls.current.forEach((el, k) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      const area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = k; }
    });
    return best;
  }, []);

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onImageSelect) return;
      const { clientX, clientY } = e;
      if (frame.current !== null) return; // coalesce to one pick per frame
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setActive(pickCard(clientX, clientY));
      });
    },
    [onImageSelect, pickCard],
  );

  React.useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);


  const css = React.useMemo(
    () =>
      `${keyframes(1, right, p)}${keyframes(-1, left, p)}` +
      // Pausing rather than disabling keeps the corridor whole: every card is
      // already dropped mid-flight by its negative delay, so it freezes as a
      // finished still instead of collapsing onto the axis.
      `@media(prefers-reduced-motion:reduce){.${card}{animation-play-state:paused}}` +
      // LOCAL ADDITION: interactive rails.
      //
      // The active card is chosen in JS, not by :hover. Chromium cannot
      // reliably hit-test elements inside this perspective/preserve-3d stack:
      // measured on the real corridor, only 2 of 18 cards were reachable by
      // the pointer anywhere on screen. So the cards opt out of hit testing
      // entirely and the container picks the card under the cursor from their
      // projected rects — which getBoundingClientRect reports correctly.
      //
      // Freezing matters as much as the lift: the cards cross the corridor in
      // seconds, so without a pause clicking one is luck. But the freeze
      // (applied inline below, on every card at once — see the comment
      // there for why it has to be inline) has to apply to every card at
      // once, not just the one under the cursor: each card's CSS animation
      // keeps its own clock, and `animationDelay` spaces them evenly by
      // giving every card a different phase within that clock. Pausing a
      // single card lets its siblings keep running, so however long the
      // hold lasted gets added permanently to that one card's phase — it
      // comes back out of its slot and stays there, rather than resyncing
      // after a lap.
      (onImageSelect
        ? `.${card}{pointer-events:none}` +
          // Resting depth: a cast shadow plus a hairline inner edge. Without
          // the edge, neighbouring cards in the ribbon merge into one another
          // where their photos happen to have similar tones.
          `.${face}{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s ease,filter .3s ease;` +
          `box-shadow:0 10px 30px rgba(0,0,0,.34),inset 0 0 0 1px rgba(255,255,255,.14)}` +
          // Active/focus: lift, deepen the cast shadow and switch the hairline
          // to gold so the target of a click is unmistakable.
          `.${card}:focus-within .${face},.${face}[data-active="true"]{transform:scale(1.12);` +
          `box-shadow:0 26px 70px rgba(0,0,0,.55),inset 0 0 0 1.5px rgba(232,184,32,.9);` +
          `filter:saturate(1.08) brightness(1.04)}` +
          // The rule under the name grows on activation — a small, cheap tell
          // that the card is live rather than decoration.
          `.${cap} i{display:block;height:2px;width:14px;margin-bottom:.5cqw;border-radius:2px;` +
          `background:linear-gradient(90deg,#FFEFB0,#E8B820);transition:width .3s ease}` +
          `.${card}:focus-within .${cap} i,.${face}[data-active="true"] .${cap} i{width:34px}`
        : ""),
    [right, left, card, face, cap, onImageSelect, p],
  );

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...props}
      style={{ containerType: "inline-size", ...props.style }}
    >
      <style>{css}</style>

      {/* LOCAL ADDITION: the container owns the pointer; the cards opt out. */}
      <div
        aria-hidden={onImageSelect ? undefined : true}
        className={cn("absolute inset-0", !onImageSelect && "pointer-events-none")}
        style={{
          perspective: `${p.perspective}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
          cursor: onImageSelect && active !== null ? "pointer" : undefined,
        }}
        onPointerMove={onImageSelect ? handlePointerMove : undefined}
        onPointerLeave={onImageSelect ? () => setActive(null) : undefined}
        onClick={
          onImageSelect
            ? () => {
                if (active === null) return;
                onImageSelect((active % cards) % Math.max(images.length, 1));
              }
            : undefined
        }
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {[right, left].map((name) =>
            Array.from({ length: cards }, (_, i) => {
              // Both rails walk the same sequence, so the left side mirrors
              // the right at every depth.
              const index = i % Math.max(images.length, 1);
              const img = images[index];
              // LOCAL ADDITION: interactive rails render an inner <button> face
              // inside the animated card; decorative rails render exactly what
              // upstream does — the image straight into the card.
              const isPrimaryRail = name === right;
              const media = img ? (
                <img
                  src={img.src}
                  alt={img.alt ?? ""}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : null;

              // Flat slot index across both rails, matching cardEls order.
              const slot = (isPrimaryRail ? 0 : cards) + i;
              const isActive = onImageSelect ? active === slot : false;

              return (
                <div
                  key={`${name}-${i}`}
                  ref={onImageSelect ? (el) => { cardEls.current[slot] = el; } : undefined}
                  className={cn(card, "absolute", !onImageSelect && "overflow-hidden")}
                  style={{
                    left: "50%",
                    top: `${axis}%`,
                    width: `${p.cardWidth}cqw`,
                    height: `${p.cardHeight}cqw`,
                    marginLeft: `${-p.cardWidth / 2}cqw`,
                    marginTop: `${-p.cardHeight / 2}cqw`,
                    borderRadius: onImageSelect ? undefined : `${p.cardRadius}cqw`,
                    animation: `${name} ${speed}s linear infinite`,
                    // Negative delay drops each card mid-flight, so the
                    // corridor is already full on the first frame.
                    animationDelay: `${-(i * speed) / cards}s`,
                    backfaceVisibility: "hidden",
                    // LOCAL ADDITION: pause every card — keyed on "is anything
                    // active", not "is this card active" — so a hold of any
                    // length can't desync one card's phase from its siblings.
                    // Has to be inline, not a `[data-ish-paused] .card{...}`
                    // stylesheet rule: the `animation` shorthand two lines up
                    // is also inline, and it resets animation-play-state to
                    // running as part of that same declaration — inline
                    // always wins over an external rule for the same
                    // property, no matter how the selector is written.
                    ...(onImageSelect && active !== null ? { animationPlayState: "paused" } : null),
                    // Raise the active card above its neighbours.
                    ...(isActive ? { zIndex: 20 } : null),
                  }}
                >
                  {onImageSelect ? (
                    <button
                      type="button"
                      onClick={() => onImageSelect(index)}
                      // Keyboard focus drives the same `active` state pointer
                      // hover does, so tabbing to a card freezes the whole
                      // corridor exactly like hovering one does — one path
                      // for both input modes, not a separate CSS trigger that
                      // could pause a single card and desync it again.
                      onFocus={() => setActive(slot)}
                      onBlur={() => setActive((cur) => (cur === slot ? null : cur))}
                      aria-label={img?.label ?? img?.alt ?? undefined}
                      // The rails are a mirrored loop, so every card appears
                      // twice. Only the right rail is reachable by keyboard;
                      // the left duplicate would double every tab stop.
                      tabIndex={isPrimaryRail ? 0 : -1}
                      aria-hidden={isPrimaryRail ? undefined : true}
                      data-active={isActive ? "true" : undefined}
                      className={cn(
                        face,
                        "relative block h-full w-full cursor-pointer overflow-hidden p-0",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90",
                      )}
                      style={{
                        borderRadius: `${p.cardRadius}cqw`,
                        ...(isActive
                          ? { transform: "scale(1.12)", boxShadow: "0 24px 60px rgba(0,0,0,.5)" }
                          : null),
                      }}
                    >
                      {media}
                      {/* Vignette: darkens the corners so a bright photo does
                          not bleed into the card beside it. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 block"
                        style={{
                          background:
                            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.35) 100%)",
                        }}
                      />
                      {img?.caption ? (
                        <>
                          {/* Scrim keeps the name legible over any photo. */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-0 block"
                            style={{
                              height: "52%",
                              background:
                                "linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.3) 55%, transparent)",
                            }}
                          />
                          {/* Sized in cqw so it tracks the corridor: distant
                              cards read as texture, near ones as a label. */}
                          <span
                            className={cn(cap, "pointer-events-none absolute inset-x-0 bottom-0 block text-left text-white")}
                            style={{
                              padding: "0 1.2cqw 1.1cqw",
                              textShadow: "0 1px 3px rgba(0,0,0,.65)",
                            }}
                          >
                            <i aria-hidden />
                            <span
                              className="block"
                              style={{ fontSize: "1.5cqw", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.15 }}
                            >
                              {img.caption}
                            </span>
                            {img.sublabel ? (
                              <span
                                className="block"
                                style={{
                                  fontSize: "0.95cqw",
                                  fontWeight: 600,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                  color: "rgba(255,239,176,.85)",
                                  marginTop: ".25cqw",
                                }}
                              >
                                {img.sublabel}
                              </span>
                            ) : null}
                          </span>
                        </>
                      ) : null}
                    </button>
                  ) : (
                    media
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

export default ImageStreamHero;
