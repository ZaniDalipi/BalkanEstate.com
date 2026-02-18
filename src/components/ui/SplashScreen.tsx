import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { AppleHelloEnglishEffect } from '@/src/components/ui/apple-hello-effect';

/* ------------------------------------------------------------------ */
/*  Logo                                                               */
/* ------------------------------------------------------------------ */
const SplashLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fillRule="evenodd">
      <path fill="#003A96" d="M12 21V5L10 7V23L12 21Z M4 21V10L2 12V23L4 21Z" />
      <path fill="#0252CD" d="M12 5H20V21H12V5Z M4 10H10V21H4V10Z" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  AuroraLayer                                                        */
/*  Animated aurora borealis background using CSS gradients + filter.   */
/* ------------------------------------------------------------------ */
const AuroraLayer: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className={cn(
        `[--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
        [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]
        [background-image:var(--white-gradient),var(--aurora)]
        [background-size:300%,_200%]
        [background-position:50%_50%,50%_50%]
        filter blur-[10px] invert
        after:content-[""] after:absolute after:inset-0
        after:[background-image:var(--white-gradient),var(--aurora)]
        after:[background-size:200%,_100%]
        after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
        pointer-events-none
        absolute -inset-[10px] opacity-50 will-change-transform`,
        `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
      )}
    />
  </div>
);

/* ------------------------------------------------------------------ */
/*  HelloGreeting                                                      */
/*  Apple-style handwritten "hello" drawn with SVG path animation.     */
/* ------------------------------------------------------------------ */
interface HelloGreetingProps {
  onComplete?: () => void;
  userName?: string;
}

const HelloGreeting: React.FC<HelloGreetingProps> = ({ onComplete, userName }) => {
  const [showName, setShowName] = useState(false);

  const handleHelloAnimComplete = useCallback(() => {
    if (userName) {
      setShowName(true);
    } else {
      onComplete?.();
    }
  }, [userName, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center">
      <AppleHelloEnglishEffect
        className="h-24 sm:h-32 md:h-40 lg:h-48 text-neutral-800"
        speed={0.5}
        onAnimationComplete={handleHelloAnimComplete}
      />
      <AnimatePresence>
        {showName && userName && (
          <motion.p
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 text-3xl sm:text-4xl md:text-5xl font-light text-neutral-500 tracking-wide"
            style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}
            onAnimationComplete={() => {
              setTimeout(() => onComplete?.(), 300);
            }}
          >
            {userName}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  BrandReveal                                                        */
/*  Logo on the left, "BalkanEstate" as one word, ".AI" superscript.   */
/*  Revealed with a smooth left-to-right clip animation.               */
/* ------------------------------------------------------------------ */
interface BrandRevealProps {
  onComplete?: () => void;
}

const BrandReveal: React.FC<BrandRevealProps> = ({ onComplete }) => {
  const { t } = useTranslation(['common']);
  const [showAI, setShowAI] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  return (
    <div className="flex flex-col items-center">
      {/* Logo + wordmark row */}
      <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
        {/* Logo — scales up first */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <SplashLogo className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24" />
        </motion.div>

        {/* Text — revealed left-to-right like being written */}
        <div className="flex items-baseline">
          {/* "Balkan" — clips in from left */}
          <motion.span
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-neutral-900"
            style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}
          >
            Balkan
          </motion.span>

          {/* "Estate" — clips in right after */}
          <motion.span
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            style={{
              fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif",
              color: '#0252CD',
            }}
            onAnimationComplete={() => setShowAI(true)}
          >
            Estate
          </motion.span>

          {/* ".AI" — gradient blue-to-cyan, pops in */}
          <motion.sup
            initial={{ opacity: 0, scale: 0.6, x: -4 }}
            animate={showAI ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold ml-1"
            style={{
              fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif",
              background: 'linear-gradient(135deg, #0252CD, #00B4D8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            onAnimationComplete={() => { if (showAI) setShowTagline(true); }}
          >
            .AI
          </motion.sup>
        </div>
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={showTagline ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm md:text-base text-neutral-400 font-light tracking-wide"
        onAnimationComplete={() => { if (showTagline && onComplete) onComplete(); }}
      >
        {t('common:splash.tagline')}
      </motion.p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SplashScreen                                                       */
/* ------------------------------------------------------------------ */
interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
  userName?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 2500,
  userName,
}) => {
  const [phase, setPhase] = useState<'hello' | 'brand' | 'done'>('hello');
  const [brandDone, setBrandDone] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeReached(true), minimumDuration);
    return () => clearTimeout(t);
  }, [minimumDuration]);

  const handleHelloComplete = useCallback(() => {
    setPhase('brand');
  }, []);

  const handleBrandComplete = useCallback(() => {
    setBrandDone(true);
  }, []);

  useEffect(() => {
    if (phase === 'brand' && brandDone && minTimeReached) {
      const t = setTimeout(() => setPhase('done'), 500);
      return () => clearTimeout(t);
    }
  }, [phase, brandDone, minTimeReached]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onComplete, 300);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  // Reduced motion
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    if (mq.matches) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [onComplete]);

  if (prefersReduced) return null;

  return (
    <AnimatePresence>
      {phase !== 'done' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-white"
        >
          <AuroraLayer />

          <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 w-full">
            <AnimatePresence mode="wait">
              {/* Phase 1 — hello in user's language */}
              {phase === 'hello' && (
                <motion.div
                  key="hello"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <HelloGreeting onComplete={handleHelloComplete} userName={userName} />
                </motion.div>
              )}

              {/* Phase 2 — brand */}
              {phase === 'brand' && (
                <motion.div
                  key="brand"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex flex-col items-center"
                >
                  <BrandReveal onComplete={handleBrandComplete} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
