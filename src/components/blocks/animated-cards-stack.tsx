import React, { useRef, createContext, useContext } from 'react';
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

/* ─── Scroll context shared between container and cards ─── */
interface ScrollCtx {
  progress: MotionValue<number>;
  total: number;
}
const ScrollContext = createContext<ScrollCtx | null>(null);

/* ─── ContainerScroll: wraps the tall scroll area ─── */
export const ContainerScroll: React.FC<{
  children: React.ReactNode;
  className?: string;
  totalCards?: number;
}> = ({ children, className = '', totalCards = 1 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <ScrollContext.Provider value={{ progress: scrollYProgress, total: totalCards }}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </ScrollContext.Provider>
  );
};

/* ─── CardsContainer: center-positioned card stack ─── */
export const CardsContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`relative ${className}`}>
    {children}
  </div>
);

/* ─── Card style variants ─── */
const cardVariants = cva(
  'absolute inset-0 flex flex-col justify-between rounded-2xl p-6 sm:p-8 shadow-xl will-change-transform',
  {
    variants: {
      variant: {
        light: 'bg-white/70 backdrop-blur-lg border border-white/30 text-slate-800',
        dark: 'bg-slate-800 border border-slate-700 text-white',
      },
    },
    defaultVariants: { variant: 'light' },
  }
);

/* ─── CardTransformed: each card in the animated stack ─── */
interface CardTransformedProps extends VariantProps<typeof cardVariants> {
  children: React.ReactNode;
  index: number;
  arrayLength: number;
  className?: string;
  role?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export const CardTransformed: React.FC<CardTransformedProps> = ({
  children,
  index,
  arrayLength,
  variant,
  className = '',
  ...props
}) => {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error('CardTransformed must be wrapped in ContainerScroll');

  const { progress } = ctx;
  const total = arrayLength;

  // Each card gets a segment of the scroll range
  // Card 0 is active at scroll 0, card 1 at scroll 1/total, etc.
  const segmentSize = 1 / total;
  const start = index * segmentSize;
  const end = (index + 1) * segmentSize;

  // Card starts flat and visible when it's "active"
  // When scroll moves past it, the card rotates away upward and fades out
  // Cards behind (not yet active) sit slightly scaled down and stacked

  // Before this card is active: it sits behind, stacked
  // During active: it's front and center (rotate=0, scale=1, opacity=1)
  // After active: it flings away (rotate up, translate up, fade out)

  const rotate = useTransform(
    progress,
    [
      Math.max(0, start - 0.001), // just before active
      start,                       // active start
      end - segmentSize * 0.1,     // near end of active
      Math.min(1, end),            // end of active
    ],
    [
      0,    // waiting behind: no rotation
      0,    // active: flat
      0,    // still active
      -15,  // flung away
    ]
  );

  const y = useTransform(
    progress,
    [
      Math.max(0, start - 0.001),
      start,
      end - segmentSize * 0.1,
      Math.min(1, end),
    ],
    [
      0,
      0,
      0,
      -80,  // flies up when dismissed
    ]
  );

  const scale = useTransform(
    progress,
    [
      Math.max(0, start - 0.001),
      start,
      end - segmentSize * 0.1,
      Math.min(1, end),
    ],
    [
      // Cards behind are slightly smaller to create depth
      1 - (total - index) * 0.02,
      1,      // active: full size
      1,
      0.9,    // shrinks as it leaves
    ]
  );

  const opacity = useTransform(
    progress,
    [
      Math.max(0, start - 0.001),
      start,
      end - segmentSize * 0.2,
      Math.min(1, end),
    ],
    [
      index === 0 ? 1 : 0.6,  // behind cards are dimmer
      1,                        // active: fully visible
      1,
      0,                        // fades out when dismissed
    ]
  );

  // Z-index: active card is on top.
  // We use a dynamic approach: cards that haven't been scrolled past are stacked
  // with later cards having lower z-index (they're behind)
  // Once scrolled past, they drop to lowest z-index
  const zIndex = useTransform(progress, (p) => {
    if (p >= end) return 0; // already dismissed
    return total - index;   // not yet dismissed: stack order
  });

  return (
    <motion.div
      style={{
        rotateX: rotate,
        y,
        scale,
        opacity,
        zIndex,
        transformOrigin: 'center bottom',
      }}
      className={cardVariants({ variant, className })}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/* ─── ReviewStars component ─── */
export const ReviewStars: React.FC<{
  rating: number;
  className?: string;
}> = ({ rating, className = '' }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;

  return (
    <div className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFull = i < full;
        const isHalf = i === full && half;
        return (
          <svg
            key={i}
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill={isFull ? 'currentColor' : 'none'}
            stroke={isFull ? 'none' : 'currentColor'}
            strokeWidth={isFull ? 0 : 1.5}
          >
            {isHalf ? (
              <>
                <defs>
                  <linearGradient id={`star-half-${i}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={`url(#star-half-${i})`}
                  stroke="currentColor"
                  strokeWidth={1}
                />
              </>
            ) : (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            )}
          </svg>
        );
      })}
    </div>
  );
};
