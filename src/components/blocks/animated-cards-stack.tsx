import React, { useRef, createContext, useContext } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

/* ─── Scroll context ─── */
const ScrollContext = createContext<{ progress: ReturnType<typeof useScroll>['scrollYProgress'] } | null>(null);

/* ─── ContainerScroll: wraps the scroll area ─── */
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

/* ─── CardsContainer: centers & sizes the card stack ─── */
export const CardsContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`relative ${className}`}>
    {children}
  </div>
);

/* ─── Card variants ─── */
const cardVariants = cva(
  'absolute inset-0 flex flex-col justify-between rounded-2xl p-6 shadow-lg border',
  {
    variants: {
      variant: {
        light: 'bg-white border-neutral-200/60 text-slate-800',
        dark: 'bg-slate-800 border-slate-700 text-white',
      },
    },
    defaultVariants: {
      variant: 'light',
    },
  }
);

/* ─── CardTransformed: each card in the stack ─── */
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
  if (!ctx) throw new Error('CardTransformed must be inside ContainerScroll');

  const { progress } = ctx;

  // Each card starts stacked behind and rotates/translates into view as the user scrolls
  const cardIndex = index - 1; // 0-based
  const segmentSize = 1 / (arrayLength + 1);
  const start = cardIndex * segmentSize;
  const end = start + segmentSize;

  // Rotation: starts rotated, ends at 0
  const rotate = useTransform(progress, [start, end], [12 - cardIndex * 2, 0]);
  // Y translation: starts offset, ends at center
  const y = useTransform(progress, [start, end], [30 + cardIndex * 8, 0]);
  // Scale: starts smaller, ends at 1
  const scale = useTransform(progress, [start, end], [0.95 - cardIndex * 0.02, 1]);
  // Opacity: fades in
  const opacity = useTransform(
    progress,
    [Math.max(0, start - segmentSize * 0.3), start, end, Math.min(1, end + segmentSize)],
    [cardIndex === 0 ? 1 : 0.4, 1, 1, cardIndex === arrayLength - 1 ? 1 : 0.3]
  );

  return (
    <motion.div
      style={{
        rotate,
        y,
        scale,
        opacity,
        zIndex: arrayLength - cardIndex,
      }}
      className={cardVariants({ variant, className })}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/* ─── ReviewStars ─── */
export const ReviewStars: React.FC<{
  rating: number;
  className?: string;
}> = ({ rating, className = '' }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill={i < fullStars ? 'currentColor' : i === fullStars && hasHalf ? 'url(#half)' : 'none'}
          stroke="currentColor"
          strokeWidth={i < fullStars || (i === fullStars && hasHalf) ? 0 : 1.5}
        >
          {i === fullStars && hasHalf && (
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
          )}
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};
