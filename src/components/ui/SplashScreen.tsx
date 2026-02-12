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
/*  BrandWriteEffect                                                   */
/*  Draws "BalkanEstate" with thick visible strokes, then fills them   */
/*  in with a satisfying color flood. ".AI" gets its own moment.       */
/* ------------------------------------------------------------------ */
const DASH = 1500;

interface BrandWriteProps {
  onComplete?: () => void;
}

const BrandWriteEffect: React.FC<BrandWriteProps> = ({ onComplete }) => {
  const [filled, setFilled] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <motion.svg
        viewBox="0 0 540 80"
        className="w-full max-w-[250px] sm:max-w-[360px] md:max-w-[450px] lg:max-w-[540px] h-auto"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* ---- Stroke draws: thick, visible, satisfying ---- */}
        <motion.text
          x="0" y="60" fontSize="66"
          fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
          fontWeight="800" letterSpacing="-2"
          fill="none" stroke="#0a0a0a" strokeWidth="2"
          initial={{ strokeDasharray: DASH, strokeDashoffset: DASH }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        >
          Balkan
        </motion.text>

        <motion.text
          x="280" y="60" fontSize="66"
          fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
          fontWeight="800" letterSpacing="-2"
          fill="none" stroke="#0252CD" strokeWidth="2"
          initial={{ strokeDasharray: DASH, strokeDashoffset: DASH }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          onAnimationComplete={() => setFilled(true)}
        >
          Estate
        </motion.text>

        {/* ---- Fill flood: color fills in after outlines complete ---- */}
        <motion.text
          x="0" y="60" fontSize="66"
          fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
          fontWeight="800" letterSpacing="-2"
          fill="#0a0a0a" stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: filled ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Balkan
        </motion.text>

        <motion.text
          x="280" y="60" fontSize="66"
          fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
          fontWeight="800" letterSpacing="-2"
          fill="#0252CD" stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: filled ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.08 }}
          onAnimationComplete={() => { if (filled) setAiVisible(true); }}
        >
          Estate
        </motion.text>
      </motion.svg>

      {/* ".AI" — appears with a subtle pop after the fill */}
      <motion.span
        initial={{ opacity: 0, y: 4, scale: 0.9 }}
        animate={aiVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-2xl sm:text-3xl md:text-4xl font-light text-neutral-300 tracking-wide -mt-1 sm:-mt-2"
        onAnimationComplete={() => { if (aiVisible && onComplete) onComplete(); }}
      >
        .AI
      </motion.span>
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

  // Minimum display timer
  useEffect(() => {
    const t = setTimeout(() => setMinTimeReached(true), minimumDuration);
    return () => clearTimeout(t);
  }, [minimumDuration]);

  // hello → brand
  const handleHelloComplete = useCallback(() => {
    setPhase('brand');
  }, []);

  // brand animation done
  const handleBrandComplete = useCallback(() => {
    setBrandDone(true);
  }, []);

  // Exit after brand done + min time + hold
  useEffect(() => {
    if (phase === 'brand' && brandDone && minTimeReached) {
      const t = setTimeout(() => setPhase('done'), 1400);
      return () => clearTimeout(t);
    }
  }, [phase, brandDone, minTimeReached]);

  // Notify parent
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
          <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full">
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
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex flex-col items-center"
                >
                  {/* Logo — gentle scale-up */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-8 sm:mb-10"
                  >
                    <SplashLogo className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20" />
                  </motion.div>

                  {/* Brand name */}
                  <BrandWriteEffect onComplete={handleBrandComplete} />

                  {/* Tagline */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 3.2, ease: 'easeOut' }}
                    className="mt-6 sm:mt-8 text-xs sm:text-sm text-neutral-400 font-light tracking-wide"
                  >
                    AI-powered property search across the Balkans
                  </motion.p>
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
