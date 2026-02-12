import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppleHelloEnglishEffect } from './apple-hello-effect';

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
/*  BrandReveal                                                        */
/*  Logo on the left, "BalkanEstate" as one word, ".AI" superscript.   */
/*  Revealed with a smooth left-to-right clip animation.               */
/* ------------------------------------------------------------------ */
interface BrandRevealProps {
  onComplete?: () => void;
}

const BrandReveal: React.FC<BrandRevealProps> = ({ onComplete }) => {
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
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <SplashLogo className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24" />
        </motion.div>

        {/* Text — revealed left-to-right like being written */}
        <div className="flex items-baseline">
          {/* "Balkan" — clips in from left */}
          <motion.span
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-neutral-900"
            style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}
          >
            Balkan
          </motion.span>

          {/* "Estate" — clips in right after */}
          <motion.span
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.9 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            style={{
              fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif",
              color: '#0252CD',
            }}
            onAnimationComplete={() => setShowAI(true)}
          >
            Estate
          </motion.span>

          {/* ".AI" — pops in as superscript */}
          <motion.sup
            initial={{ opacity: 0, scale: 0.6, x: -4 }}
            animate={showAI ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal text-neutral-300 ml-0.5"
            style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}
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
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm md:text-base text-neutral-400 font-light tracking-wide"
        onAnimationComplete={() => { if (showTagline && onComplete) onComplete(); }}
      >
        AI-powered property search across the Balkans
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
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 4500,
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

  // Hold after brand animation finishes
  useEffect(() => {
    if (phase === 'brand' && brandDone && minTimeReached) {
      const t = setTimeout(() => setPhase('done'), 1400);
      return () => clearTimeout(t);
    }
  }, [phase, brandDone, minTimeReached]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onComplete, 700);
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
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-white"
        >
          <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 w-full">
            <AnimatePresence mode="wait">
              {/* Phase 1 — hello */}
              {phase === 'hello' && (
                <motion.div
                  key="hello"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <AppleHelloEnglishEffect
                    className="h-16 sm:h-24 md:h-28 text-neutral-800 w-auto"
                    speed={1}
                    onAnimationComplete={handleHelloComplete}
                  />
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
