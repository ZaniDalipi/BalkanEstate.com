import * as React from 'react';
import { VariantProps, cva } from 'class-variance-authority';
import {
  HTMLMotionProps,
  MotionValue,
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from 'framer-motion';
import { cn } from '@/src/lib/utils';

const cardVariants = cva('absolute will-change-transform', {
  variants: {
    variant: {
      dark: 'flex size-full flex-col items-center justify-center gap-6 rounded-2xl border border-stone-700/50 bg-accent-foreground/80 p-6 backdrop-blur-md',
      light:
        'flex size-full flex-col items-center justify-center gap-6 rounded-2xl bg-white/80 p-6 backdrop-blur-md',
    },
  },
  defaultVariants: {
    variant: 'light',
  },
});

interface ReviewProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number;
  maxRating?: number;
}

interface CardStickyProps
  extends HTMLMotionProps<'div'>,
    VariantProps<typeof cardVariants> {
  arrayLength: number;
  index: number;
  incrementY?: number;
  incrementZ?: number;
  incrementRotation?: number;
}

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>;
}

const ContainerScrollContext = React.createContext<
  ContainerScrollContextValue | undefined
>(undefined);

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext);
  if (context === undefined) {
    throw new Error(
      'useContainerScrollContext must be used within a ContainerScrollContextProvider'
    );
  }
  return context;
}

export const ContainerScroll: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ children, style, className, ...props }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLElement>(null);
  const [, forceUpdate] = React.useState(0);

  // Find the nearest scrollable ancestor so useScroll tracks the correct
  // container (e.g. when the page scrolls inside a <main> with overflow-y-auto
  // rather than the window).
  React.useLayoutEffect(() => {
    let el = scrollRef.current?.parentElement ?? null;
    while (el) {
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        (containerRef as React.MutableRefObject<HTMLElement | null>).current =
          el;
        forceUpdate((n) => n + 1);
        return;
      }
      el = el.parentElement;
    }
  }, []);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    ...(containerRef.current
      ? { container: containerRef as React.RefObject<HTMLElement> }
      : {}),
    offset: ['start start', 'end end'],
  });

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div
        ref={scrollRef}
        className={cn('relative min-h-svh w-full', className)}
        style={{ perspective: '1000px', ...style }}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  );
};
ContainerScroll.displayName = 'ContainerScroll';

export const CardsContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn('relative', className)}
      style={{ perspective: '1000px', ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
};
CardsContainer.displayName = 'CardsContainer';

export const CardTransformed = React.forwardRef<
  HTMLDivElement,
  CardStickyProps
>(
  (
    {
      arrayLength,
      index,
      incrementY = 10,
      incrementZ = 10,
      incrementRotation = 5,
      className,
      variant,
      style,
      ...props
    },
    ref
  ) => {
    const { scrollYProgress } = useContainerScrollContext();

    const start = index / (arrayLength + 1);
    const end = (index + 1) / (arrayLength + 1);

    // Extend the active range so each card has more scroll distance
    const extendedEnd = Math.min(end + (end - start) * 0.4, 1);
    const range = React.useMemo(() => [start, extendedEnd], [start, extendedEnd]);

    // Each card starts with a fan rotation (index * step) and flies away with extra tilt
    const initialRotation = index * incrementRotation;
    const flyAwayRotation = incrementRotation === 0 ? 0 : initialRotation + 25;

    // Cards start big (1.08) and scale down to 0.7 as they fly away
    const scale = useTransform(scrollYProgress, range, [1.08, 0.7]);

    // Cards move UP aggressively — use numeric values for proper interpolation
    const y = useTransform(scrollYProgress, range, [0, -250]);
    const rotate = useTransform(scrollYProgress, range, [
      initialRotation,
      flyAwayRotation,
    ]);

    // Fade starts very late — card stays fully visible for 80% of its range
    const fadeStart = start + (extendedEnd - start) * 0.8;
    const opacity = useTransform(scrollYProgress, [start, fadeStart, extendedEnd], [1, 1, 0]);

    const transform = useMotionTemplate`translateZ(${
      index * incrementZ
    }px) translateY(${y}%) scale(${scale}) rotate(${rotate}deg)`;

    const dx = useTransform(scrollYProgress, range, [0, 6]);
    const dy = useTransform(scrollYProgress, range, [16, 2]);
    const blur = useTransform(scrollYProgress, range, [32, 4]);
    const alpha = useTransform(scrollYProgress, range, [0.25, 0.02]);

    const filter =
      variant === 'light'
        ? useMotionTemplate`drop-shadow(${dx}px ${dy}px ${blur}px rgba(0,0,0,${alpha}))`
        : 'none';

    const cardStyle = {
      top: index * incrementY,
      transform,
      opacity,
      backfaceVisibility: 'hidden' as const,
      zIndex: (arrayLength - index) * incrementZ,
      filter,
      ...style,
    };

    return (
      <motion.div
        layout="position"
        ref={ref}
        style={cardStyle}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
CardTransformed.displayName = 'CardTransformed';

export const ReviewStars = React.forwardRef<HTMLDivElement, ReviewProps>(
  ({ rating, maxRating = 5, className, ...props }, ref) => {
    const filledStars = Math.floor(rating);
    const fractionalPart = rating - filledStars;
    const emptyStars = maxRating - filledStars - (fractionalPart > 0 ? 1 : 0);

    return (
      <div
        className={cn('flex items-center gap-2', className)}
        ref={ref}
        {...props}
      >
        <div className="flex items-center">
          {[...Array(filledStars)].map((_, index) => (
            <svg
              key={`filled-${index}`}
              className="size-4 text-inherit"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          ))}
          {fractionalPart > 0 && (
            <svg
              className="size-4 text-inherit"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <defs>
                <linearGradient id="half">
                  <stop
                    offset={`${fractionalPart * 100}%`}
                    stopColor="currentColor"
                  />
                  <stop
                    offset={`${fractionalPart * 100}%`}
                    stopColor="rgb(209 213 219)"
                  />
                </linearGradient>
              </defs>
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"
                fill="url(#half)"
              />
            </svg>
          )}
          {[...Array(emptyStars)].map((_, index) => (
            <svg
              key={`empty-${index}`}
              className="size-4 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          ))}
        </div>
        <p className="sr-only">{rating}</p>
      </div>
    );
  }
);
ReviewStars.displayName = 'ReviewStars';
