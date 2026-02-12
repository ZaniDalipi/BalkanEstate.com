import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppleHelloEnglishEffect } from './apple-hello-effect';

/* ------------------------------------------------------------------ */
/*  Logo (matches the app LogoIcon)                                    */
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
/*  BrandWriteEffect — draws "BalkanEstate.AI" with stroke animation   */
/* ------------------------------------------------------------------ */
const DASH = 1200; // large enough to cover any text path length

interface BrandWriteProps {
  onAnimationComplete?: () => void;
}

const BrandWriteEffect: React.FC<BrandWriteProps> = ({ onAnimationComplete }) => {
  const [fillPhase, setFillPhase] = useState(false);

  // After the stroke finishes drawing, reveal the solid fill
  const handleStrokeComplete = useCallback(() => {
    setFillPhase(true);
  }, []);

  return (
    <motion.svg
      viewBox="0 0 620 80"
      className="w-full max-w-[280px] sm:max-w-[400px] md:max-w-[520px] lg:max-w-[620px] h-auto"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* ---- Stroke layer: draws the text ---- */}
      {/* "Balkan" */}
      <motion.text
        x="0"
        y="58"
        fontSize="62"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="700"
        letterSpacing="-1"
        fill="none"
        stroke="#171717"
        strokeWidth="1.8"
        initial={{ strokeDasharray: DASH, strokeDashoffset: DASH }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
      >
        Balkan
      </motion.text>

      {/* "Estate" */}
      <motion.text
        x="275"
        y="58"
        fontSize="62"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="700"
        letterSpacing="-1"
        fill="none"
        stroke="#0252CD"
        strokeWidth="1.8"
        initial={{ strokeDasharray: DASH, strokeDashoffset: DASH }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1], delay: 0.6 }}
        onAnimationComplete={handleStrokeComplete}
      >
        Estate
      </motion.text>

      {/* ".AI" */}
      <motion.text
        x="520"
        y="58"
        fontSize="62"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="500"
        letterSpacing="-1"
        fill="none"
        stroke="#a3a3a3"
        strokeWidth="1.2"
        initial={{ strokeDasharray: DASH, strokeDashoffset: DASH }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1], delay: 1.4 }}
      >
        .AI
      </motion.text>

      {/* ---- Fill layer: fades in after strokes complete ---- */}
      <motion.text
        x="0"
        y="58"
        fontSize="62"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="700"
        letterSpacing="-1"
        fill="#171717"
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: fillPhase ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Balkan
      </motion.text>

      <motion.text
        x="275"
        y="58"
        fontSize="62"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="700"
        letterSpacing="-1"
        fill="#0252CD"
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: fillPhase ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      >
        Estate
      </motion.text>

      <motion.text
        x="520"
        y="58"
        fontSize="62"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="500"
        letterSpacing="-1"
        fill="#a3a3a3"
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: fillPhase ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        onAnimationComplete={() => {
          if (fillPhase && onAnimationComplete) onAnimationComplete();
        }}
      >
        .AI
      </motion.text>
    </motion.svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Decorative underline that draws itself                             */
/* ------------------------------------------------------------------ */
const DrawUnderline: React.FC = () => (
  <motion.svg
    viewBox="0 0 320 8"
    className="w-48 sm:w-64 md:w-80 h-2 mt-1"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <motion.path
      d="M2 5C60 2 140 2 160 4C180 6 260 6 318 3"
      stroke="url(#underlineGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: 2.4 }}
    />
    <defs>
      <linearGradient id="underlineGrad" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0252CD" stopOpacity="0.15" />
        <stop offset="50%" stopColor="#0252CD" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#0252CD" stopOpacity="0.15" />
      </linearGradient>
    </defs>
  </motion.svg>
);

/* ------------------------------------------------------------------ */
/*  SplashScreen                                                       */
/* ------------------------------------------------------------------ */
interface SplashScreenProps {
  onComplete: () => void;
  /** Minimum ms the splash stays visible (default 4200) */
  minimumDuration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 4200,
}) => {
  const [phase, setPhase] = useState<'hello' | 'brand' | 'done'>('hello');
  const [brandAnimDone, setBrandAnimDone] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);

  // Minimum display timer — ensures enough time for resources to load behind
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeReached(true), minimumDuration);
    return () => clearTimeout(timer);
  }, [minimumDuration]);

  // When the "hello" animation finishes, move to brand reveal
  const handleHelloComplete = useCallback(() => {
    setPhase('brand');
  }, []);

  // When the brand write + fill animation finishes
  const handleBrandAnimComplete = useCallback(() => {
    setBrandAnimDone(true);
  }, []);

  // Exit only after brand animation is done AND min time reached, plus hold time
  useEffect(() => {
    if (phase === 'brand' && brandAnimDone && minTimeReached) {
      const holdTimer = setTimeout(() => setPhase('done'), 1200);
      return () => clearTimeout(holdTimer);
    }
  }, [phase, brandAnimDone, minTimeReached]);

  // Notify parent when fully done
  useEffect(() => {
    if (phase === 'done') {
      const fadeTimer = setTimeout(onComplete, 600);
      return () => clearTimeout(fadeTimer);
    }
  }, [phase, onComplete]);

  // Respect reduced-motion preference
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    if (mq.matches) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [onComplete]);

  if (prefersReduced) {
    return null;
  }

  return (
    <AnimatePresence>
      {phase !== 'done' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-white"
        >
          {/* Soft ambient glow effects */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(2,82,205,0.1) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-lg sm:max-w-xl md:max-w-2xl">
            <AnimatePresence mode="wait">
              {/* Phase 1: Hello animation */}
              {phase === 'hello' && (
                <motion.div
                  key="hello-phase"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex flex-col items-center"
                >
                  <AppleHelloEnglishEffect
                    className="h-14 sm:h-20 md:h-24 text-neutral-800 w-auto"
                    speed={1.1}
                    onAnimationComplete={handleHelloComplete}
                  />
                </motion.div>
              )}

              {/* Phase 2: Brand — stroke-drawn text */}
              {phase === 'brand' && (
                <motion.div
                  key="brand-phase"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center"
                >
                  {/* Logo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="mb-6 sm:mb-8 p-4 sm:p-5 rounded-3xl border border-neutral-100"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(249,250,251,0.8) 0%, rgba(255,255,255,0.9) 100%)',
                      boxShadow:
                        '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)',
                    }}
                  >
                    <SplashLogo className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" />
                  </motion.div>

                  {/* Stroke-drawn brand name */}
                  <BrandWriteEffect onAnimationComplete={handleBrandAnimComplete} />

                  {/* Decorative underline */}
                  <DrawUnderline />

                  {/* Tagline — fades in after text is drawn */}
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 2.8, ease: 'easeOut' }}
                    className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-neutral-400 font-light text-center max-w-xs sm:max-w-sm"
                  >
                    AI-powered property search across the Balkans
                  </motion.p>

                  {/* Loading dots */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 3.2 }}
                    className="mt-6 sm:mt-8"
                  >
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-neutral-300"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute bottom-6 sm:bottom-8 text-[10px] sm:text-xs text-neutral-300 tracking-widest uppercase"
          >
            11 countries &bull; 50+ cities
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
