import React, { useEffect, useRef, useState, useCallback, memo } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

type AnimationVariant =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'scaleIn'
  | 'slideInUp'
  | 'slideInDown'
  | 'slideInLeft'
  | 'slideInRight'
  | 'bounceIn'
  | 'blurIn';

type AnimationDuration = 'fast' | 'normal' | 'slow' | 'slower';

interface AnimatedProps {
  children: React.ReactNode;
  variant?: AnimationVariant;
  duration?: AnimationDuration;
  delay?: number;
  className?: string;
  once?: boolean; // Only animate once when entering viewport
  threshold?: number; // Intersection observer threshold (0-1)
  as?: keyof JSX.IntrinsicElements;
}

interface StaggeredListProps {
  children: React.ReactNode[];
  variant?: AnimationVariant;
  duration?: AnimationDuration;
  staggerDelay?: number;
  className?: string;
  itemClassName?: string;
  once?: boolean;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
  itemAs?: keyof JSX.IntrinsicElements;
}

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

// ============================================================================
// Animation Duration Map
// ============================================================================

const durationMap: Record<AnimationDuration, number> = {
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 700,
};

const durationClassMap: Record<AnimationDuration, string> = {
  fast: 'duration-200',
  normal: 'duration-300',
  slow: 'duration-500',
  slower: 'duration-700',
};

// ============================================================================
// Animation Variant Classes
// ============================================================================

const variantInitialClasses: Record<AnimationVariant, string> = {
  fadeIn: 'opacity-0',
  fadeInUp: 'opacity-0 translate-y-6',
  fadeInDown: 'opacity-0 -translate-y-6',
  fadeInLeft: 'opacity-0 translate-x-6',
  fadeInRight: 'opacity-0 -translate-x-6',
  scaleIn: 'opacity-0 scale-95',
  slideInUp: 'opacity-0 translate-y-full',
  slideInDown: 'opacity-0 -translate-y-full',
  slideInLeft: 'opacity-0 translate-x-full',
  slideInRight: 'opacity-0 -translate-x-full',
  bounceIn: 'opacity-0 scale-50',
  blurIn: 'opacity-0 blur-sm',
};

const variantAnimatedClasses: Record<AnimationVariant, string> = {
  fadeIn: 'opacity-100',
  fadeInUp: 'opacity-100 translate-y-0',
  fadeInDown: 'opacity-100 translate-y-0',
  fadeInLeft: 'opacity-100 translate-x-0',
  fadeInRight: 'opacity-100 translate-x-0',
  scaleIn: 'opacity-100 scale-100',
  slideInUp: 'opacity-100 translate-y-0',
  slideInDown: 'opacity-100 translate-y-0',
  slideInLeft: 'opacity-100 translate-x-0',
  slideInRight: 'opacity-100 translate-x-0',
  bounceIn: 'opacity-100 scale-100',
  blurIn: 'opacity-100 blur-0',
};

// ============================================================================
// Custom Hook: useIntersectionObserver
// ============================================================================

function useIntersectionObserver(
  options: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
  } = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isVisible];
}

// ============================================================================
// Custom Hook: useAnimation (for programmatic control)
// ============================================================================

export function useAnimation(initialState = false) {
  const [isAnimating, setIsAnimating] = useState(initialState);
  const [hasAnimated, setHasAnimated] = useState(false);

  const trigger = useCallback(() => {
    setIsAnimating(true);
    setHasAnimated(true);
  }, []);

  const reset = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const toggle = useCallback(() => {
    setIsAnimating((prev) => !prev);
    if (!hasAnimated) setHasAnimated(true);
  }, [hasAnimated]);

  return { isAnimating, hasAnimated, trigger, reset, toggle };
}

// ============================================================================
// Animated Component - Main animation wrapper
// ============================================================================

export const Animated = memo(function Animated({
  children,
  variant = 'fadeInUp',
  duration = 'normal',
  delay = 0,
  className = '',
  once = true,
  threshold = 0.1,
  as: Component = 'div',
}: AnimatedProps) {
  const [ref, isVisible] = useIntersectionObserver({ threshold, once });

  const baseClasses = 'transition-all ease-out transform';
  const durationClass = durationClassMap[duration];
  const initialClass = variantInitialClasses[variant];
  const animatedClass = variantAnimatedClasses[variant];

  const delayStyle = delay > 0 ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${baseClasses} ${durationClass} ${isVisible ? animatedClass : initialClass} ${className}`}
      style={delayStyle}
    >
      {children}
    </Component>
  );
});

// ============================================================================
// FadeIn - Simple fade in animation
// ============================================================================

export const FadeIn = memo(function FadeIn({
  children,
  duration = 'normal',
  delay = 0,
  className = '',
  once = true,
}: Omit<AnimatedProps, 'variant'>) {
  return (
    <Animated variant="fadeIn" duration={duration} delay={delay} className={className} once={once}>
      {children}
    </Animated>
  );
});

// ============================================================================
// SlideIn - Slide in from direction
// ============================================================================

interface SlideInProps extends Omit<AnimatedProps, 'variant'> {
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const SlideIn = memo(function SlideIn({
  children,
  direction = 'up',
  duration = 'normal',
  delay = 0,
  className = '',
  once = true,
}: SlideInProps) {
  const variantMap: Record<string, AnimationVariant> = {
    up: 'fadeInUp',
    down: 'fadeInDown',
    left: 'fadeInLeft',
    right: 'fadeInRight',
  };
  return (
    <Animated variant={variantMap[direction]} duration={duration} delay={delay} className={className} once={once}>
      {children}
    </Animated>
  );
});

// ============================================================================
// StaggeredList - Animate children with staggered delays
// ============================================================================

export const StaggeredList = memo(function StaggeredList({
  children,
  variant = 'fadeInUp',
  duration = 'normal',
  staggerDelay = 50,
  className = '',
  itemClassName = '',
  once = true,
  threshold = 0.1,
  as: Container = 'div',
  itemAs: ItemComponent = 'div',
}: StaggeredListProps) {
  const [ref, isVisible] = useIntersectionObserver({ threshold, once });

  const baseClasses = 'transition-all ease-out transform';
  const durationClass = durationClassMap[duration];
  const initialClass = variantInitialClasses[variant];
  const animatedClass = variantAnimatedClasses[variant];

  return (
    <Container ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {React.Children.map(children, (child, index) => (
        <ItemComponent
          key={index}
          className={`${baseClasses} ${durationClass} ${isVisible ? animatedClass : initialClass} ${itemClassName}`}
          style={{ transitionDelay: isVisible ? `${index * staggerDelay}ms` : '0ms' }}
        >
          {child}
        </ItemComponent>
      ))}
    </Container>
  );
});

// ============================================================================
// PageTransition - Wrapper for page-level animations
// ============================================================================

export const PageTransition = memo(function PageTransition({
  children,
  className = '',
}: PageTransitionProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = requestAnimationFrame(() => {
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${className}`}
    >
      {children}
    </div>
  );
});

// ============================================================================
// AnimatedNumber - Smooth number counting animation
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.5, once: true });

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easeOut * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, isVisible]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
});

// ============================================================================
// Skeleton - Loading placeholder with animation
// ============================================================================

export const Skeleton = memo(function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses: Record<string, string> = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const animationClasses: Record<string, string> = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'circular' ? width : undefined),
  };

  return (
    <div
      className={`bg-gray-200 ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
});

// ============================================================================
// SkeletonCard - Common card skeleton
// ============================================================================

export const SkeletonCard = memo(function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm ${className}`}>
      <Skeleton variant="rectangular" height={160} className="rounded-xl mb-4" />
      <Skeleton variant="text" className="mb-2 w-3/4" />
      <Skeleton variant="text" className="mb-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  );
});

// ============================================================================
// LoadingSpinner - Animated loading indicator
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  className = '',
  color = 'primary',
}: LoadingSpinnerProps) {
  const sizeClasses: Record<string, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-${color}/20 border-t-${color} animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
});

// ============================================================================
// AnimatedList - For rendering lists with smooth enter/exit
// ============================================================================

interface AnimatedListProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
  variant?: AnimationVariant;
  staggerDelay?: number;
  className?: string;
  emptyState?: React.ReactNode;
}

export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
  variant = 'fadeInUp',
  staggerDelay = 50,
  className = '',
  emptyState,
}: AnimatedListProps<T>) {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.05, once: true });

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const durationClass = durationClassMap.normal;
  const initialClass = variantInitialClasses[variant];
  const animatedClass = variantAnimatedClasses[variant];

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {items.map((item, index) => (
        <div
          key={keyExtractor(item, index)}
          className={`transition-all ease-out transform ${durationClass} ${
            isVisible ? animatedClass : initialClass
          }`}
          style={{ transitionDelay: isVisible ? `${index * staggerDelay}ms` : '0ms' }}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  Animated,
  FadeIn,
  SlideIn,
  StaggeredList,
  PageTransition,
  AnimatedNumber,
  Skeleton,
  SkeletonCard,
  LoadingSpinner,
  AnimatedList,
  useAnimation,
};
