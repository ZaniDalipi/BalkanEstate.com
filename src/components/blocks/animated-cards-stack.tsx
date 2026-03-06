import React, { useRef, createContext, useContext } from 'react';
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

/* ─── Scroll context shared between container and cards ─── */
interface ScrollCtx {
  progress: MotionValue<number>;
}
const ScrollContext = createContext<ScrollCtx | null>(null);

/* ─── ContainerScroll: wraps the tall scroll area ─── */
export const ContainerScroll: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <ScrollContext.Provider value={{ progress: scrollYProgress }}>
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
  'absolute inset-0 flex flex-col justify-between rounded-2xl p-6 sm:p-8 shadow-xl',
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

  // Reverse order: last item in array appears first (on top initially)
  // Each card "activates" during its scroll segment
  const total = arrayLength;
  const segmentSize = 1 / total;

  // The card at index 0 is the top card (first shown)
  // As scroll progresses, card 0 animates away, card 1 becomes active, etc.
  const reverseIdx = index - 2; // offset to match the caller's index pattern (starts at 2)
  const cardIdx = Math.max(0, reverseIdx);

  // Scroll range for when this card is "active" (front of stack)
  const activeStart = cardIdx * segmentSize;
  const activeEnd = (cardIdx + 1) * segmentSize;

  // Before active: card is behind in the stack with initial rotation
  // During active: card rotates to front (0 deg) and is fully visible
  // After active: card rotates away and fades out

  const rotate = useTransform(
    progress,
    [
      Math.max(0, activeStart - segmentSize * 0.5),
      activeStart,
      activeEnd,
      Math.min(1, activeEnd + segmentSize * 0.3),
    ],
    [
      8 + cardIdx * 3,  // stacked behind with rotation
      0,                 // active: no rotation
      0,                 // still active
      -8,               // rotating away
    ]
  );

  const y = useTransform(
    progress,
    [
      Math.max(0, activeStart - segmentSize * 0.5),
      activeStart,
      activeEnd,
      Math.min(1, activeEnd + segmentSize * 0.3),
    ],
    [
      20 + cardIdx * 6,
      0,
      0,
      -30,
    ]
  );

  const scale = useTransform(
    progress,
    [
      Math.max(0, activeStart - segmentSize * 0.5),
      activeStart,
      activeEnd,
      Math.min(1, activeEnd + segmentSize * 0.3),
    ],
    [
      0.92 - cardIdx * 0.02,
      1,
      1,
      0.95,
    ]
  );

  const opacity = useTransform(
    progress,
    [
      Math.max(0, activeStart - segmentSize * 0.3),
      activeStart,
      activeEnd,
      Math.min(1, activeEnd + segmentSize * 0.2),
    ],
    [
      cardIdx === 0 ? 1 : 0.4,
      1,
      1,
      cardIdx === total - 1 ? 1 : 0,
    ]
  );

  return (
    <motion.div
      style={{
        rotate,
        y,
        scale,
        opacity,
        zIndex: total - cardIdx,
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
