import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
/*  FloatingBlobs                                                      */
/*  Subtle animated background shapes — very low opacity, slow drift.  */
/* ------------------------------------------------------------------ */
const FloatingBlobs: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 500, height: 500, top: '-10%', right: '-8%',
        background: 'radial-gradient(circle, rgba(2,82,205,0.07) 0%, transparent 70%)',
      }}
      animate={{ x: [0, 30, -20, 0], y: [0, 20, -10, 0], scale: [1, 1.08, 0.95, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 400, height: 400, bottom: '-5%', left: '-5%',
        background: 'radial-gradient(circle, rgba(0,180,216,0.06) 0%, transparent 70%)',
      }}
      animate={{ x: [0, -25, 15, 0], y: [0, -15, 25, 0], scale: [1, 1.1, 0.92, 1] }}
      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 250, height: 250, top: '35%', left: '15%',
        background: 'radial-gradient(circle, rgba(2,82,205,0.04) 0%, transparent 70%)',
      }}
      animate={{ x: [0, 20, -15, 0], y: [0, -20, 10, 0], scale: [1, 1.12, 0.9, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 120, height: 120, top: '20%', left: '30%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
      }}
      animate={{ x: [0, 40, -30, 0], y: [0, 30, -20, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 300, height: 300, bottom: '15%', right: '10%',
        background: 'radial-gradient(circle, rgba(0,180,216,0.04) 0%, transparent 70%)',
      }}
      animate={{ x: [0, -20, 30, 0], y: [0, 15, -25, 0], scale: [1, 0.95, 1.08, 1] }}
      transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

/* ------------------------------------------------------------------ */
/*  MultiLangHello                                                     */
/*  Cycles "hello" through many languages with smooth crossfades.      */
/*  Balkan languages featured prominently, then world languages.       */
/* ------------------------------------------------------------------ */
const GREETINGS = [
  'hello',          // English
  'përshëndetje',   // Albanian
  'здраво',         // Serbian
  'bok',            // Croatian
  'merhaba',        // Turkish
  'γεια σας',       // Greek
  'ciao',           // Italian
  'bonjour',        // French
  'hola',           // Spanish
  'hallo',          // German
  'olá',            // Portuguese
  'привет',         // Russian
  'مرحبا',          // Arabic
  'こんにちは',       // Japanese
  '你好',           // Chinese
  '안녕하세요',      // Korean
  'नमस्ते',         // Hindi
];

const HOLD_MS = 350;

interface MultiLangHelloProps {
  onComplete?: () => void;
}

const MultiLangHello: React.FC<MultiLangHelloProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= GREETINGS.length - 1) {
      // Hold the last greeting a bit, then fire complete
      const t = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => i + 1), HOLD_MS);
    return () => clearTimeout(t);
  }, [index, onComplete]);

  return (
    <div className="flex items-center justify-center h-20 sm:h-28 md:h-36">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.92 }}
          transition={{
            duration: 0.25,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight italic text-neutral-800 select-none"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', 'SF Pro Display', serif",
            letterSpacing: '-0.02em',
          }}
        >
          {GREETINGS[index]}
        </motion.span>
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

          {/* ".AI" — gradient blue-to-cyan, pops in */}
          <motion.sup
            initial={{ opacity: 0, scale: 0.6, x: -4 }}
            animate={showAI ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
          <FloatingBlobs />

          <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 w-full">
            <AnimatePresence mode="wait">
              {/* Phase 1 — multi-language hello cycle */}
              {phase === 'hello' && (
                <motion.div
                  key="hello"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <MultiLangHello onComplete={handleHelloComplete} />
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
